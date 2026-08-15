import type { Request, Response } from 'express';
import { db, type DbRow, type SqlValue } from '../db/index.ts';
import { toCamel, toCamelList } from '../utils/case.ts';
import { notFound } from '../utils/errors.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';

const CUSTOMER_SELECT = `
  SELECT c.*,
         (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.payment_status <> 'cancelled') AS total_purchases,
         (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s WHERE s.customer_id = c.id AND s.payment_status <> 'cancelled') AS total_spent,
         (SELECT MAX(s.sale_date) FROM sales s WHERE s.customer_id = c.id) AS last_transaction
  FROM customers c
`;

export function listCustomers(req: Request, res: Response): void {
  const q = req.query as Record<string, string | undefined>;
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (q.search) {
    where.push('(c.full_name LIKE ? OR c.phone LIKE ? OR c.vehicle_number LIKE ? OR c.rfid_id LIKE ?)');
    const like = `%${q.search}%`;
    params.push(like, like, like, like);
  }
  if (q.vehicleType) { where.push('c.vehicle_type = ?'); params.push(q.vehicleType); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.prepare(`${CUSTOMER_SELECT} ${whereSql} ORDER BY c.full_name ASC`).all(...params) as Record<string, unknown>[];
  res.json({ success: true, message: 'Customers loaded', data: toCamelList(rows) });
}

export function getCustomer(req: Request, res: Response): void {
  const customer = db.prepare(`${CUSTOMER_SELECT} WHERE c.id = ?`).get(req.params.id) as Record<string, unknown> | undefined;
  if (!customer) throw notFound('Customer not found');

  const history = db.prepare(
    `SELECT s.id, s.sale_date, s.total_amount, s.payment_method, s.payment_status,
            p.pump_number, f.name AS fuel_name, sd.litres, e.full_name AS attendant
     FROM sales s
     JOIN sale_details sd ON sd.sale_id = s.id
     JOIN pumps p ON p.id = s.pump_id
     JOIN fuels f ON f.id = sd.fuel_id
     LEFT JOIN employees e ON e.id = s.employee_id
     WHERE s.customer_id = ? ORDER BY s.sale_date DESC LIMIT 100`,
  ).all(req.params.id) as Record<string, unknown>[];

  res.json({
    success: true,
    message: 'Customer loaded',
    data: { customer: toCamel(customer), history: toCamelList(history) },
  });
}

export function createCustomer(req: Request, res: Response): void {
  const body = req.body as {
    fullName: string;
    phone?: string | null;
    vehicleNumber?: string | null;
    vehicleType?: string | null;
    rfidId?: string | null;
  };
  const r = db.prepare(
    `INSERT INTO customers (full_name, phone, vehicle_number, vehicle_type, rfid_id) VALUES (?, ?, ?, ?, ?)`,
  ).run(body.fullName, body.phone ?? null, body.vehicleNumber ?? null, body.vehicleType ?? null, body.rfidId ?? null);
  const id = Number(r.lastInsertRowid);

  logAudit(auditContext(req), { action: 'create_customer', module: 'customers', recordId: id, newValues: body });
  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: toCamel(db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id) as Record<string, unknown>),
  });
}

export function updateCustomer(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Customer not found');

  const body = req.body as {
    fullName?: string;
    phone?: string | null;
    vehicleNumber?: string | null;
    vehicleType?: string | null;
    rfidId?: string | null;
  };
  db.prepare(
    `UPDATE customers SET full_name = ?, phone = ?, vehicle_number = ?, vehicle_type = ?, rfid_id = ? WHERE id = ?`,
  ).run(
    body.fullName ?? existing.full_name,
    body.phone !== undefined ? body.phone : existing.phone,
    body.vehicleNumber !== undefined ? body.vehicleNumber : existing.vehicle_number,
    body.vehicleType !== undefined ? body.vehicleType : existing.vehicle_type,
    body.rfidId !== undefined ? body.rfidId : existing.rfid_id,
    req.params.id,
  );

  logAudit(auditContext(req), {
    action: 'update_customer',
    module: 'customers',
    recordId: Number(req.params.id),
    oldValues: existing,
    newValues: body,
  });

  res.json({
    success: true,
    message: 'Customer updated successfully',
    data: toCamel(db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id) as Record<string, unknown>),
  });
}

export function deleteCustomer(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Customer not found');

  db.prepare(`DELETE FROM customers WHERE id = ?`).run(req.params.id);
  logAudit(auditContext(req), { action: 'delete_customer', module: 'customers', recordId: Number(req.params.id), oldValues: existing });
  res.json({ success: true, message: 'Customer deleted', data: null });
}
