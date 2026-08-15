import type { Request, Response } from 'express';
import { db, type DbRow, type SqlValue } from '../db/index.ts';
import { toCamelList } from '../utils/case.ts';
import { notFound } from '../utils/errors.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';

const PUMP_SELECT = `
  SELECT p.id, p.pump_number, p.fuel_id, p.current_reading, p.status, p.assigned_employee_id, p.location,
         f.name AS fuel_name, f.price_per_litre,
         e.full_name AS assigned_employee_name,
         (SELECT MAX(s.sale_date) FROM sales s WHERE s.pump_id = p.id) AS last_transaction_at,
         (SELECT COUNT(*) FROM sales s WHERE s.pump_id = p.id AND substr(s.sale_date, 1, 10) = date('now')) AS today_sales,
         (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s
          WHERE s.pump_id = p.id AND substr(s.sale_date, 1, 10) = date('now') AND s.payment_status <> 'cancelled') AS today_revenue
  FROM pumps p
  LEFT JOIN fuels f ON f.id = p.fuel_id
  LEFT JOIN employees e ON e.id = p.assigned_employee_id
`;

export function listPumps(req: Request, res: Response): void {
  const q = req.query as Record<string, string | undefined>;
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (q.status && q.status !== 'all') { where.push('p.status = ?'); params.push(q.status); }
  if (q.search) {
    where.push('(p.pump_number LIKE ? OR f.name LIKE ? OR e.full_name LIKE ?)');
    const like = `%${q.search}%`;
    params.push(like, like, like);
  }
  // Attendants only ever see their own pump.
  if (req.user!.role === 'ATTENDANT') {
    where.push('p.assigned_employee_id = ?');
    params.push(req.user!.employeeId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.prepare(`${PUMP_SELECT} ${whereSql} ORDER BY p.pump_number ASC`).all(...params) as Record<string, unknown>[];
  res.json({ success: true, message: 'Pumps loaded', data: toCamelList(rows) });
}

export function getPump(req: Request, res: Response): void {
  const row = db.prepare(`${PUMP_SELECT} WHERE p.id = ?`).get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) throw notFound('Pump not found');
  res.json({ success: true, message: 'Pump loaded', data: toCamelList([row])[0] });
}

export function createPump(req: Request, res: Response): void {
  const body = req.body as {
    pumpNumber: string;
    fuelId?: number | null;
    currentReading?: number;
    status?: string;
    assignedEmployeeId?: number | null;
    location?: string | null;
  };
  if (body.fuelId) {
    const fuel = db.prepare(`SELECT id FROM fuels WHERE id = ?`).get(body.fuelId);
    if (!fuel) throw notFound('Fuel not found');
  }
  if (body.assignedEmployeeId) {
    const emp = db.prepare(`SELECT id FROM employees WHERE id = ?`).get(body.assignedEmployeeId);
    if (!emp) throw notFound('Employee not found');
  }

  const r = db.prepare(
    `INSERT INTO pumps (pump_number, fuel_id, current_reading, status, assigned_employee_id, location)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    body.pumpNumber,
    body.fuelId ?? null,
    body.currentReading ?? 0,
    body.status ?? 'active',
    body.assignedEmployeeId ?? null,
    body.location ?? null,
  );
  const id = Number(r.lastInsertRowid);

  logAudit(auditContext(req), { action: 'create_pump', module: 'pumps', recordId: id, newValues: body });
  res.status(201).json({
    success: true,
    message: 'Pump created successfully',
    data: toCamelList([db.prepare(`${PUMP_SELECT} WHERE p.id = ?`).get(id) as Record<string, unknown>])[0],
  });
}

export function updatePump(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM pumps WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Pump not found');

  const body = req.body as {
    pumpNumber?: string;
    fuelId?: number | null;
    currentReading?: number;
    status?: string;
    assignedEmployeeId?: number | null;
    location?: string | null;
  };

  db.prepare(
    `UPDATE pumps SET pump_number = ?, fuel_id = ?, current_reading = ?, status = ?, assigned_employee_id = ?, location = ? WHERE id = ?`,
  ).run(
    body.pumpNumber ?? existing.pump_number,
    body.fuelId !== undefined ? body.fuelId : existing.fuel_id,
    body.currentReading ?? existing.current_reading,
    body.status ?? existing.status,
    body.assignedEmployeeId !== undefined ? body.assignedEmployeeId : existing.assigned_employee_id,
    body.location !== undefined ? body.location : existing.location,
    req.params.id,
  );

  logAudit(auditContext(req), {
    action: 'update_pump',
    module: 'pumps',
    recordId: Number(req.params.id),
    oldValues: existing,
    newValues: body,
  });

  res.json({
    success: true,
    message: 'Pump updated successfully',
    data: toCamelList([db.prepare(`${PUMP_SELECT} WHERE p.id = ?`).get(req.params.id) as Record<string, unknown>])[0],
  });
}

export function deletePump(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM pumps WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Pump not found');

  db.prepare(`DELETE FROM pumps WHERE id = ?`).run(req.params.id);
  logAudit(auditContext(req), { action: 'delete_pump', module: 'pumps', recordId: Number(req.params.id), oldValues: existing });
  res.json({ success: true, message: 'Pump deleted', data: null });
}
