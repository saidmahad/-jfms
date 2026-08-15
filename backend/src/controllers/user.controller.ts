import type { Request, Response } from 'express';
import { db, type DbRow } from '../db/index.ts';
import { toCamel, toCamelList } from '../utils/case.ts';
import { badRequest, notFound } from '../utils/errors.ts';
import { hashPassword } from '../utils/password.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';

export function listUsers(_req: Request, res: Response): void {
  const rows = db.prepare(
    `SELECT u.id, u.username, u.email, u.role, u.status, u.employee_id, u.last_login, u.created_at, u.updated_at,
            e.full_name AS employee_name, e.position
     FROM users u LEFT JOIN employees e ON e.id = u.employee_id
     ORDER BY u.username ASC`,
  ).all() as Record<string, unknown>[];
  res.json({ success: true, message: 'Users loaded', data: toCamelList(rows) });
}

export function createUser(req: Request, res: Response): void {
  const body = req.body as {
    username: string;
    email: string;
    password?: string;
    role: 'ADMIN' | 'MANAGER' | 'ATTENDANT';
    status?: string;
    employeeId?: number | null;
  };

  if (!body.password) throw badRequest('Password is required when creating a user');

  if (body.employeeId) {
    const emp = db.prepare(`SELECT id FROM employees WHERE id = ?`).get(body.employeeId);
    if (!emp) throw notFound('Employee not found');
  }

  const r = db.prepare(
    `INSERT INTO users (username, email, password, role, status, employee_id) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    body.username,
    body.email,
    hashPassword(body.password),
    body.role,
    body.status ?? 'active',
    body.employeeId ?? null,
  );
  const id = Number(r.lastInsertRowid);

  logAudit(auditContext(req), {
    action: 'create_user',
    module: 'users',
    recordId: id,
    newValues: { username: body.username, email: body.email, role: body.role, status: body.status },
  });
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: toCamel(db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as Record<string, unknown>),
  });
}

export function updateUser(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('User not found');

  // Prevent an admin from deactivating themselves or stripping their own role.
  if (Number(req.params.id) === req.user!.id) {
    const body = req.body as { status?: string; role?: string };
    if (body.status === 'inactive' || (body.role && body.role !== existing.role)) {
      throw badRequest('You cannot deactivate or change your own account role');
    }
  }

  const body = req.body as {
    username?: string;
    email?: string;
    password?: string;
    role?: 'ADMIN' | 'MANAGER' | 'ATTENDANT';
    status?: string;
    employeeId?: number | null;
  };

  const roleChanged = body.role !== undefined && body.role !== existing.role;
  const oldRole = existing.role;

  db.prepare(
    `UPDATE users SET username = ?, email = ?, password = ?, role = ?, status = ?, employee_id = ? WHERE id = ?`,
  ).run(
    body.username ?? existing.username,
    body.email ?? existing.email,
    body.password ? hashPassword(body.password) : existing.password,
    body.role ?? existing.role,
    body.status ?? existing.status,
    body.employeeId !== undefined ? body.employeeId : existing.employee_id,
    req.params.id,
  );

  logAudit(auditContext(req), {
    action: roleChanged ? 'change_user_role' : 'update_user',
    module: 'users',
    recordId: Number(req.params.id),
    oldValues: roleChanged ? { role: oldRole } : existing,
    newValues: body,
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: toCamel(db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id) as Record<string, unknown>),
  });
}

export function updateUserStatus(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('User not found');

  const status = (req.body as { status: string }).status;
  if (Number(req.params.id) === req.user!.id && status === 'inactive') {
    throw badRequest('You cannot deactivate your own account');
  }

  db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, req.params.id);
  logAudit(auditContext(req), {
    action: status === 'active' ? 'activate_user' : 'deactivate_user',
    module: 'users',
    recordId: Number(req.params.id),
    oldValues: { status: existing.status },
    newValues: { status },
  });

  res.json({ success: true, message: `User ${status === 'active' ? 'activated' : 'deactivated'}`, data: null });
}
