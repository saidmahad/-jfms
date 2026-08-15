import { db, transaction, type SqlValue } from '../db/index.ts';
import { toCamel, toCamelList } from '../utils/case.ts';
import { ApiError, badRequest, notFound } from '../utils/errors.ts';
import type { AuthUser } from '../types/express.d.ts';
import { logAudit, type AuditContext } from './audit.service.ts';
import { alertLowStock } from './notification.service.ts';

export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'rfid' | 'other';
export type PaymentStatus = 'paid' | 'pending' | 'cancelled';

export interface CreateSaleInput {
  pumpId: number;
  fuelId: number;
  litres: number;
  customerId?: number | null;
  employeeId?: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface SaleRow {
  id: number;
  employeeId: number | null;
  employeeName: string | null;
  pumpId: number;
  pumpNumber: string;
  fuelId: number;
  fuelName: string;
  litres: number;
  pricePerLitre: number;
  subtotal: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  saleDate: string;
  customerId: number | null;
  customerName: string | null;
  vehicleNumber: string | null;
}

const SALE_SELECT = `
  SELECT
    s.id, s.sale_date, s.total_amount, s.payment_method, s.payment_status,
    s.employee_id, e.full_name AS employee_name,
    s.pump_id, p.pump_number,
    sd.fuel_id, f.name AS fuel_name,
    sd.litres, sd.price_per_litre, sd.subtotal,
    s.customer_id, c.full_name AS customer_name, c.vehicle_number
  FROM sales s
  JOIN sale_details sd ON sd.sale_id = s.id
  JOIN pumps p ON p.id = s.pump_id
  JOIN fuels f ON f.id = sd.fuel_id
  LEFT JOIN employees e ON e.id = s.employee_id
  LEFT JOIN customers c ON c.id = s.customer_id
`;

export function getSaleById(id: number): SaleRow {
  const row = db.prepare(`${SALE_SELECT} WHERE s.id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) throw notFound('Sale not found');
  return toCamel(row) as unknown as SaleRow;
}

export function listSales(filters: {
  page?: number;
  perPage?: number;
  from?: string;
  to?: string;
  employeeId?: number;
  pumpId?: number;
  fuelId?: number;
  paymentMethod?: string;
  search?: string;
  ownOnly?: boolean;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? 20));
  const where: string[] = [];
  const params: SqlValue[] = [];

  if (filters.from) { where.push('s.sale_date >= ?'); params.push(filters.from); }
  if (filters.to) { where.push('s.sale_date <= ?'); params.push(filters.to); }
  if (filters.employeeId) { where.push('s.employee_id = ?'); params.push(filters.employeeId); }
  if (filters.pumpId) { where.push('s.pump_id = ?'); params.push(filters.pumpId); }
  if (filters.fuelId) { where.push('sd.fuel_id = ?'); params.push(filters.fuelId); }
  if (filters.paymentMethod) { where.push('s.payment_method = ?'); params.push(filters.paymentMethod); }
  if (filters.ownOnly) { where.push('s.employee_id = ?'); params.push(filters.employeeId ?? -1); }
  if (filters.search) {
    where.push('(s.id LIKE ? OR p.pump_number LIKE ? OR f.name LIKE ? OR e.full_name LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countRow = db.prepare(
    `SELECT COUNT(*) AS c FROM sales s JOIN sale_details sd ON sd.sale_id = s.id
     JOIN pumps p ON p.id = s.pump_id JOIN fuels f ON f.id = sd.fuel_id
     LEFT JOIN employees e ON e.id = s.employee_id ${whereSql}`,
  ).get(...params) as { c: number };

  const rows = db.prepare(
    `${SALE_SELECT} ${whereSql} ORDER BY s.sale_date DESC, s.id DESC LIMIT ? OFFSET ?`,
  ).all(...params, perPage, (page - 1) * perPage) as Record<string, unknown>[];

  return {
    items: toCamelList(rows) as unknown as SaleRow[],
    total: countRow.c,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(countRow.c / perPage)),
  };
}

/**
 * Core sales flow (all steps run inside a single database transaction):
 * validate user -> validate pump -> validate fuel -> validate litres -> get server price
 * -> calculate total -> check inventory -> insert sale -> insert sale detail
 * -> reduce inventory -> update pump reading -> create stock movement -> low stock alert
 * -> audit log. Any failure rolls everything back.
 */
export function createSale(user: AuthUser, input: CreateSaleInput, audit: AuditContext): SaleRow {
  if (input.litres <= 0) throw badRequest('Sale litres must be greater than zero');

  // Validate pump
  const pump = db.prepare(
    `SELECT p.*, f.name AS fuel_name FROM pumps p LEFT JOIN fuels f ON f.id = p.fuel_id WHERE p.id = ?`,
  ).get(input.pumpId) as Record<string, unknown> | undefined;
  if (!pump) throw notFound('Pump not found');
  if (pump.status !== 'active') throw badRequest(`Pump ${pump.pump_number} is not active and cannot process sales`);

  // Validate fuel
  const fuel = db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(input.fuelId) as Record<string, unknown> | undefined;
  if (!fuel) throw notFound('Fuel not found');
  if (fuel.status !== 'active') throw badRequest(`${fuel.name} is inactive and cannot be sold`);

  // Check inventory
  const litres = Number(input.litres);
  if (litres > Number(fuel.current_quantity)) {
    throw new ApiError(422, 'Insufficient fuel inventory', {
      litres: [`Only ${Number(fuel.current_quantity).toLocaleString()} L of ${fuel.name} is available`],
    });
  }

  // Server-side price + total. Never trust the client's total.
  const pricePerLitre = Number(fuel.price_per_litre);
  const totalAmount = round2(litres * pricePerLitre);

  // Attendants must record sales against their own employee account.
  let employeeId = input.employeeId ?? user.employeeId;
  if (user.role === 'ATTENDANT') employeeId = user.employeeId;
  if (employeeId) {
    const emp = db.prepare(`SELECT id, status FROM employees WHERE id = ?`).get(employeeId) as
      | { id: number; status: string }
      | undefined;
    if (!emp) throw notFound('Employee not found');
    if (emp.status !== 'active') throw badRequest('Inactive employees cannot make transactions');
  }
  if (!employeeId) throw badRequest('A valid employee must be associated with the sale');

  if (input.customerId) {
    const cust = db.prepare(`SELECT id FROM customers WHERE id = ?`).get(input.customerId);
    if (!cust) throw notFound('Customer not found');
  }

  const paymentStatus: PaymentStatus = input.paymentStatus ?? 'paid';

  let saleId = 0;
  transaction(() => {
    const now = new Date().toISOString();
    const saleRes = db.prepare(
      `INSERT INTO sales (employee_id, pump_id, customer_id, sale_date, total_amount, payment_method, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(employeeId, input.pumpId, input.customerId ?? null, now, totalAmount, input.paymentMethod, paymentStatus);
    saleId = Number(saleRes.lastInsertRowid);

    db.prepare(
      `INSERT INTO sale_details (sale_id, fuel_id, litres, price_per_litre, subtotal)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(saleId, input.fuelId, litres, pricePerLitre, totalAmount);

    // Reduce inventory
    db.prepare(
      `UPDATE fuels SET current_quantity = ROUND(current_quantity - ?, 3) WHERE id = ?`,
    ).run(litres, input.fuelId);

    // Update pump reading
    db.prepare(
      `UPDATE pumps SET current_reading = ROUND(current_reading + ?, 3) WHERE id = ?`,
    ).run(litres, input.pumpId);

    // Traceable stock movement
    db.prepare(
      `INSERT INTO inventory_transactions (fuel_id, supplier_id, type, quantity, reference, notes, created_by)
       VALUES (?, NULL, 'sale', ?, ?, ?, ?)`,
    ).run(input.fuelId, -litres, `SALE-${saleId}`, `Sale #${saleId} via ${pump.pump_number}`, user.id);

    // Low stock alert (inside the transaction so it is consistent with the new balance)
    const updatedFuel = db.prepare(`SELECT id, name, current_quantity, minimum_stock FROM fuels WHERE id = ?`).get(
      input.fuelId,
    ) as { id: number; name: string; current_quantity: number; minimum_stock: number };
    alertLowStock({
      id: updatedFuel.id,
      name: updatedFuel.name,
      currentQuantity: updatedFuel.current_quantity,
      minimumStock: updatedFuel.minimum_stock,
    });
  });

  logAudit(audit, {
    action: 'create_sale',
    module: 'sales',
    recordId: saleId,
    newValues: {
      pump: pump.pump_number,
      fuel: fuel.name,
      litres,
      pricePerLitre,
      totalAmount,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      employeeId,
    },
  });

  return getSaleById(saleId);
}

/** Update payment status only; fuel has already been dispensed so stock is not adjusted. */
export function updateSalePaymentStatus(id: number, paymentStatus: PaymentStatus, audit: AuditContext): SaleRow {
  const existing = getSaleById(id);
  transaction(() => {
    db.prepare(`UPDATE sales SET payment_status = ? WHERE id = ?`).run(paymentStatus, id);
  });
  logAudit(audit, {
    action: 'update_sale_payment_status',
    module: 'sales',
    recordId: id,
    oldValues: { paymentStatus: existing.paymentStatus },
    newValues: { paymentStatus },
  });
  return getSaleById(id);
}
