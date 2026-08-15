import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { db, type DbRow } from '../db/index.ts';
import { config } from '../config.ts';
import { toCamel } from '../utils/case.ts';
import { unauthorized } from '../utils/errors.ts';
import type { AuthUser } from '../types/express.d.ts';

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function authRequired(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw unauthorized('Authentication required');
  }

  let payload: { sub: number };
  try {
    payload = jwt.verify(header.slice(7), config.jwtSecret) as unknown as { sub: number };
  } catch {
    throw unauthorized('Session expired or invalid. Please log in again.');
  }

  const row = db.prepare(
    `SELECT u.id, u.username, u.email, u.role, u.status, u.employee_id, e.full_name AS employee_name
     FROM users u
     LEFT JOIN employees e ON e.id = u.employee_id
     WHERE u.id = ?`,
  ).get(payload.sub) as DbRow | undefined;

  if (!row) throw unauthorized('Account not found');
  if (row.status !== 'active') throw unauthorized('This account is inactive. Contact an administrator.');

  req.user = toCamel(row) as unknown as AuthUser;
  next();
}
