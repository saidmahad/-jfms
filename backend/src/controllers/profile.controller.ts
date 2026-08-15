import type { Request, Response } from 'express';
import { db } from '../db/index.ts';
import { verifyPassword, hashPassword } from '../utils/password.ts';
import { badRequest } from '../utils/errors.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';
import { getPermissionsForRole } from '../utils/permissions.ts';

export function getProfile(req: Request, res: Response): void {
  const row = db.prepare(
    `SELECT u.id, u.username, u.email, u.role, u.status, u.employee_id, u.last_login, u.created_at,
            e.full_name AS employee_name, e.phone, e.position, e.salary, e.hire_date
     FROM users u LEFT JOIN employees e ON e.id = u.employee_id
     WHERE u.id = ?`,
  ).get(req.user!.id) as Record<string, unknown> | undefined;

  res.json({
    success: true,
    message: 'Profile loaded',
    data: {
      ...(row as object),
      permissions: getPermissionsForRole(req.user!.role),
    },
  });
}

export function changePassword(req: Request, res: Response): void {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

  const row = db.prepare(`SELECT password FROM users WHERE id = ?`).get(req.user!.id) as { password: string };
  if (!verifyPassword(currentPassword, row.password)) {
    throw badRequest('Current password is incorrect');
  }
  if (newPassword.length < 8) {
    throw badRequest('New password must be at least 8 characters');
  }
  if (newPassword === currentPassword) {
    throw badRequest('New password must be different from the current password');
  }

  db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(hashPassword(newPassword), req.user!.id);

  logAudit(auditContext(req), { action: 'change_password', module: 'profile', recordId: req.user!.id });
  res.json({ success: true, message: 'Password changed successfully', data: null });
}
