import { db, transaction, type SqlValue } from '../db/index.ts';
import { toCamelList } from '../utils/case.ts';
import { ApiError, badRequest, notFound } from '../utils/errors.ts';
import type { AuthUser } from '../types/express.d.ts';
import { logAudit, type AuditContext } from './audit.service.ts';
import { alertLowStock, evaluateStockLevel } from './notification.service.ts';

export interface PurchaseInput {
  fuelId: number;
  supplierId?: number | null;
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface AdjustmentInput {
  fuelId: number;
  quantity: number; // signed: positive adds, negative removes
  reason: string;
}

export function purchaseStock(user: AuthUser, input: PurchaseInput, audit: AuditContext) {
  const fuel = db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(input.fuelId) as Record<string, unknown> | undefined;
  if (!fuel) throw notFound('Fuel not found');
  if (input.quantity <= 0) throw badRequest('Purchase quantity must be greater than zero');

  if (input.supplierId) {
    const supplier = db.prepare(`SELECT id FROM suppliers WHERE id = ?`).get(input.supplierId);
    if (!supplier) throw notFound('Supplier not found');
  }

  let txId = 0;
  transaction(() => {
    const res = db.prepare(
      `INSERT INTO inventory_transactions (fuel_id, supplier_id, type, quantity, reference, notes, created_by)
       VALUES (?, ?, 'purchase', ?, ?, ?, ?)`,
    ).run(input.fuelId, input.supplierId ?? null, input.quantity, input.reference ?? null, input.notes ?? null, user.id);
    txId = Number(res.lastInsertRowid);

    db.prepare(
      `UPDATE fuels SET current_quantity = ROUND(current_quantity + ?, 3) WHERE id = ?`,
    ).run(input.quantity, input.fuelId);
  });

  logAudit(audit, {
    action: 'inventory_purchase',
    module: 'inventory',
    recordId: txId,
    newValues: { fuelId: input.fuelId, fuel: fuel.name, quantity: input.quantity, supplierId: input.supplierId },
  });

  return { id: txId, type: 'purchase', fuelId: input.fuelId, quantity: input.quantity };
}

export function adjustStock(user: AuthUser, input: AdjustmentInput, audit: AuditContext) {
  const fuel = db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(input.fuelId) as Record<string, unknown> | undefined;
  if (!fuel) throw notFound('Fuel not found');
  if (input.quantity === 0) throw badRequest('Adjustment quantity cannot be zero');
  if (!input.reason?.trim()) throw badRequest('A reason is required for stock adjustments');

  const newBalance = Number(fuel.current_quantity) + input.quantity;
  if (newBalance < 0) {
    throw new ApiError(422, 'Adjustment would bring stock below zero', {
      quantity: [`Available: ${Number(fuel.current_quantity).toLocaleString()} L`],
    });
  }

  let txId = 0;
  transaction(() => {
    const res = db.prepare(
      `INSERT INTO inventory_transactions (fuel_id, supplier_id, type, quantity, reference, notes, created_by)
       VALUES (?, NULL, 'adjustment', ?, NULL, ?, ?)`,
    ).run(input.fuelId, input.quantity, input.reason, user.id);
    txId = Number(res.lastInsertRowid);

    db.prepare(
      `UPDATE fuels SET current_quantity = ROUND(current_quantity + ?, 3) WHERE id = ?`,
    ).run(input.quantity, input.fuelId);

    const updated = db.prepare(`SELECT id, name, current_quantity, minimum_stock FROM fuels WHERE id = ?`).get(
      input.fuelId,
    ) as { id: number; name: string; current_quantity: number; minimum_stock: number };
    alertLowStock({
      id: updated.id,
      name: updated.name,
      currentQuantity: updated.current_quantity,
      minimumStock: updated.minimum_stock,
    });
  });

  logAudit(audit, {
    action: 'inventory_adjustment',
    module: 'inventory',
    recordId: txId,
    oldValues: { currentQuantity: Number(fuel.current_quantity) },
    newValues: { quantity: input.quantity, reason: input.reason, newBalance },
  });

  return { id: txId, type: 'adjustment', fuelId: input.fuelId, quantity: input.quantity, newBalance };
}

export function listStockMovements(filters: { page?: number; perPage?: number; fuelId?: number; type?: string; from?: string; to?: string }) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? 20));
  const where: string[] = [];
  const params: SqlValue[] = [];

  if (filters.fuelId) { where.push('it.fuel_id = ?'); params.push(filters.fuelId); }
  if (filters.type) { where.push('it.type = ?'); params.push(filters.type); }
  if (filters.from) { where.push('it.created_at >= ?'); params.push(filters.from); }
  if (filters.to) { where.push('it.created_at <= ?'); params.push(filters.to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = db.prepare(
    `SELECT COUNT(*) AS c FROM inventory_transactions it ${whereSql}`,
  ).get(...params) as { c: number };

  const rows = db.prepare(
    `SELECT it.*, f.name AS fuel_name, s.name AS supplier_name,
            u.username AS created_by_name
     FROM inventory_transactions it
     JOIN fuels f ON f.id = it.fuel_id
     LEFT JOIN suppliers s ON s.id = it.supplier_id
     LEFT JOIN users u ON u.id = it.created_by
     ${whereSql}
     ORDER BY it.created_at DESC, it.id DESC
     LIMIT ? OFFSET ?`,
  ).all(...params, perPage, (page - 1) * perPage) as Record<string, unknown>[];

  return {
    items: toCamelList(rows),
    total: countRow.c,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(countRow.c / perPage)),
  };
}

export function listLowStock() {
  const rows = db.prepare(
    `SELECT id, name, type, current_quantity, minimum_stock, maximum_capacity, status, updated_at
     FROM fuels WHERE current_quantity <= minimum_stock ORDER BY current_quantity ASC`,
  ).all() as Record<string, unknown>[];
  return toCamelList(rows).map((fuel) => ({
    ...fuel,
    level: evaluateStockLevel(fuel as unknown as { id: number; name: string; currentQuantity: number; minimumStock: number }),
  }));
}
