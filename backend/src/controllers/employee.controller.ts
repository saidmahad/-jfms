import type { Request, Response } from 'express';
import { db, type DbRow, type SqlValue } from '../db/index.ts';
import { toCamel, toCamelList } from '../utils/case.ts';
import { notFound } from '../utils/errors.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';

const EMPLOYEE_SELECT = `
  SELECT e.*,
         (SELECT COUNT(*) FROM sales s WHERE s.employee_id = e.id) AS total_sales,
         (SELECT COALESCE(SUM(sd.litres), 0) FROM sales s JOIN sale_details sd ON sd.sale_id = s.id WHERE s.employee_id = e.id) AS total_litres,
         (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s WHERE s.employee_id = e.id AND s.payment_status <> 'cancelled') AS total_revenue,
         (SELECT u.username FROM users u WHERE u.employee_id = e.id) AS linked_username
  FROM employees e
`;

export function listEmployees(req: Request, res: Response): void {
  const q = req.query as Record<string, string | undefined>;
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (q.search) {
    where.push('(e.full_name LIKE ? OR e.phone LIKE ? OR e.position LIKE ?)');
    const like = `%${q.search}%`;
    params.push(like, like, like);
  }
  if (q.status && q.status !== 'all') { where.push('e.status = ?'); params.push(q.status); }
  if (q.position) { where.push('e.position = ?'); params.push(q.position); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.prepare(`${EMPLOYEE_SELECT} ${whereSql} ORDER BY e.full_name ASC`).all(...params) as Record<string, unknown>[];
  res.json({ success: true, message: 'Employees loaded', data: toCamelList(rows) });
}

export function getEmployee(req: Request, res: Response): void {
  const employee = db.prepare(`${EMPLOYEE_SELECT} WHERE e.id = ?`).get(req.params.id) as Record<string, unknown> | undefined;
  if (!employee) throw notFound('Employee not found');
  res.json({ success: true, message: 'Employee loaded', data: toCamel(employee) });
}

export function createEmployee(req: Request, res: Response): void {
  const body = req.body as {
    fullName: string;
    phone?: string | null;
    position: string;
    salary: number;
    status?: string;
    hireDate: string;
  };
  const r = db.prepare(
    `INSERT INTO employees (full_name, phone, position, salary, status, hire_date) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(body.fullName, body.phone ?? null, body.position, body.salary, body.status ?? 'active', body.hireDate);
  const id = Number(r.lastInsertRowid);

  logAudit(auditContext(req), { action: 'create_employee', module: 'employees', recordId: id, newValues: body });
  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: toCamel(db.prepare(`SELECT * FROM employees WHERE id = ?`).get(id) as Record<string, unknown>),
  });
}

export function updateEmployee(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Employee not found');

  const body = req.body as {
    fullName?: string;
    phone?: string | null;
    position?: string;
    salary?: number;
    status?: string;
    hireDate?: string;
  };
  db.prepare(
    `UPDATE employees SET full_name = ?, phone = ?, position = ?, salary = ?, status = ?, hire_date = ? WHERE id = ?`,
  ).run(
    body.fullName ?? existing.full_name,
    body.phone !== undefined ? body.phone : existing.phone,
    body.position ?? existing.position,
    body.salary ?? existing.salary,
    body.status ?? existing.status,
    body.hireDate ?? existing.hire_date,
    req.params.id,
  );

  logAudit(auditContext(req), {
    action: 'update_employee',
    module: 'employees',
    recordId: Number(req.params.id),
    oldValues: existing,
    newValues: body,
  });

  res.json({
    success: true,
    message: 'Employee updated successfully',
    data: toCamel(db.prepare(`SELECT * FROM employees WHERE id = ?`).get(req.params.id) as Record<string, unknown>),
  });
}

export function updateEmployeeStatus(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Employee not found');

  const status = (req.body as { status: string }).status;
  db.prepare(`UPDATE employees SET status = ? WHERE id = ?`).run(status, req.params.id);

  logAudit(auditContext(req), {
    action: status === 'active' ? 'activate_employee' : 'deactivate_employee',
    module: 'employees',
    recordId: Number(req.params.id),
    oldValues: { status: existing.status },
    newValues: { status },
  });

  res.json({
    success: true,
    message: `${existing.full_name} ${status === 'active' ? 'activated' : 'deactivated'}`,
    data: toCamel(db.prepare(`SELECT * FROM employees WHERE id = ?`).get(req.params.id) as Record<string, unknown>),
  });
}
