import type { Request, Response } from 'express';
import { db, type DbRow, type SqlValue } from '../db/index.ts';
import { toCamel, toCamelList } from '../utils/case.ts';
import { notFound } from '../utils/errors.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';

export function listExpenses(req: Request, res: Response): void {
  const q = req.query as Record<string, string | undefined>;
  const page = Math.max(1, Number(q.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(q.perPage ?? 20)));
  const where: string[] = [];
  const params: SqlValue[] = [];

  if (q.search) {
    where.push('(description LIKE ? OR category LIKE ? OR e.full_name LIKE ?)');
    const like = `%${q.search}%`;
    params.push(like, like, like);
  }
  if (q.category) { where.push('x.category = ?'); params.push(q.category); }
  if (q.from) { where.push('x.expense_date >= ?'); params.push(q.from); }
  if (q.to) { where.push('x.expense_date <= ?'); params.push(q.to); }
  if (q.employeeId) { where.push('x.employee_id = ?'); params.push(Number(q.employeeId)); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = db.prepare(
    `SELECT COUNT(*) AS c FROM expenses x LEFT JOIN employees e ON e.id = x.employee_id ${whereSql}`,
  ).get(...params) as { c: number };

  const rows = db.prepare(
    `SELECT x.*, e.full_name AS employee_name
     FROM expenses x LEFT JOIN employees e ON e.id = x.employee_id
     ${whereSql} ORDER BY x.expense_date DESC, x.id DESC LIMIT ? OFFSET ?`,
  ).all(...params, perPage, (page - 1) * perPage) as Record<string, unknown>[];

  const totalRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses x ${whereSql}`,
  ).get(...params) as { total: number };

  res.json({
    success: true,
    message: 'Expenses loaded',
    data: {
      items: toCamelList(rows),
      total: countRow.c,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(countRow.c / perPage)),
      summary: { totalAmount: Math.round(Number(totalRow.total) * 100) / 100 },
    },
  });
}

export function createExpense(req: Request, res: Response): void {
  const body = req.body as {
    employeeId?: number | null;
    category: string;
    description: string;
    amount: number;
    paymentMethod?: string;
    expenseDate: string;
    notes?: string | null;
  };

  if (body.employeeId) {
    const emp = db.prepare(`SELECT id FROM employees WHERE id = ?`).get(body.employeeId);
    if (!emp) throw notFound('Employee not found');
  }

  const r = db.prepare(
    `INSERT INTO expenses (employee_id, category, description, amount, payment_method, expense_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    body.employeeId ?? null,
    body.category,
    body.description,
    body.amount,
    body.paymentMethod ?? 'cash',
    body.expenseDate,
    body.notes ?? null,
  );
  const id = Number(r.lastInsertRowid);

  logAudit(auditContext(req), { action: 'create_expense', module: 'expenses', recordId: id, newValues: body });
  res.status(201).json({
    success: true,
    message: 'Expense recorded successfully',
    data: toCamel(db.prepare(`SELECT * FROM expenses WHERE id = ?`).get(id) as Record<string, unknown>),
  });
}

export function updateExpense(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM expenses WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Expense not found');

  const body = req.body as {
    employeeId?: number | null;
    category?: string;
    description?: string;
    amount?: number;
    paymentMethod?: string;
    expenseDate?: string;
    notes?: string | null;
  };

  db.prepare(
    `UPDATE expenses SET employee_id = ?, category = ?, description = ?, amount = ?, payment_method = ?, expense_date = ?, notes = ? WHERE id = ?`,
  ).run(
    body.employeeId !== undefined ? body.employeeId : existing.employee_id,
    body.category ?? existing.category,
    body.description ?? existing.description,
    body.amount ?? existing.amount,
    body.paymentMethod ?? existing.payment_method,
    body.expenseDate ?? existing.expense_date,
    body.notes !== undefined ? body.notes : existing.notes,
    req.params.id,
  );

  logAudit(auditContext(req), {
    action: 'update_expense',
    module: 'expenses',
    recordId: Number(req.params.id),
    oldValues: existing,
    newValues: body,
  });

  res.json({
    success: true,
    message: 'Expense updated successfully',
    data: toCamel(db.prepare(`SELECT * FROM expenses WHERE id = ?`).get(req.params.id) as Record<string, unknown>),
  });
}

export function deleteExpense(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM expenses WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Expense not found');

  db.prepare(`DELETE FROM expenses WHERE id = ?`).run(req.params.id);
  logAudit(auditContext(req), { action: 'delete_expense', module: 'expenses', recordId: Number(req.params.id), oldValues: existing });
  res.json({ success: true, message: 'Expense deleted', data: null });
}
