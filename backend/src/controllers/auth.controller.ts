import type { Request, Response } from 'express';
import { db } from '../db/index.ts';
import { signToken } from '../middleware/auth.ts';
import { verifyPassword } from '../utils/password.ts';
import { toCamel } from '../utils/case.ts';
import { unauthorized } from '../utils/errors.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';
import { createNotification } from '../services/notification.service.ts';
import { getPermissionsForRole } from '../utils/permissions.ts';
import { getSettings } from '../services/settings.service.ts';

export function login(req: Request, res: Response): void {
  const { username, password } = req.body as { username: string; password: string };

  const row = db.prepare(
    `SELECT u.id, u.username, u.email, u.password, u.role, u.status, u.employee_id,
            e.full_name AS employee_name, e.position
     FROM users u LEFT JOIN employees e ON e.id = u.employee_id
     WHERE u.username = ? OR u.email = ?`,
  ).get(username.trim(), username.trim()) as Record<string, unknown> | undefined;

  if (!row || !verifyPassword(password, String(row.password))) {
    // Failed login is logged for audit purposes.
    logAudit(auditContext(req), {
      action: 'login_failed',
      module: 'auth',
      newValues: { username },
    });
    throw unauthorized('Invalid username or password');
  }

  if (row.status !== 'active') {
    logAudit(auditContext(req), {
      action: 'login_blocked',
      module: 'auth',
      newValues: { username, reason: 'inactive account' },
    });
    throw unauthorized('This account is inactive. Contact an administrator.');
  }

  const user = toCamel(row) as unknown as {
    id: number;
    username: string;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'ATTENDANT';
    status: string;
    employeeId: number | null;
    employeeName: string | null;
    position: string | null;
  };

  db.prepare(`UPDATE users SET last_login = ? WHERE id = ?`).run(new Date().toISOString(), user.id);

  const token = signToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    employeeId: user.employeeId,
    employeeName: user.employeeName,
  });

  logAudit(auditContext(req), { action: 'login', module: 'auth', recordId: user.id });
  createNotification({
    userId: user.id,
    type: 'login',
    title: 'New sign-in',
    message: `Signed in to JUPA Fuel Station as ${user.username}.`,
    link: '/',
  });

  const settings = getSettings();
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        employeeName: user.employeeName,
        position: user.position,
        permissions: getPermissionsForRole(user.role),
      },
      settings: {
        stationName: settings.station_name,
        currency: settings.currency,
        timezone: settings.timezone,
      },
    },
  });
}

export function logout(req: Request, res: Response): void {
  logAudit(auditContext(req), { action: 'logout', module: 'auth', recordId: req.user?.id });
  res.json({ success: true, message: 'Logged out successfully', data: null });
}

export function me(req: Request, res: Response): void {
  const settings = getSettings();
  res.json({
    success: true,
    message: 'OK',
    data: {
      user: {
        ...req.user,
        permissions: getPermissionsForRole(req.user!.role),
      },
      settings: {
        stationName: settings.station_name,
        stationAddress: settings.station_address,
        stationPhone: settings.station_phone,
        stationEmail: settings.station_email,
        currency: settings.currency,
        timezone: settings.timezone,
        receiptFooter: settings.receipt_footer,
      },
    },
  });
}
