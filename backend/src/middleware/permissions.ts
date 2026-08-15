import type { Request, Response, NextFunction } from 'express';
import { hasPermission, type Permission } from '../utils/permissions.ts';
import { forbidden, unauthorized } from '../utils/errors.ts';

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw unauthorized();
    if (!hasPermission(req.user.role, permission)) {
      throw forbidden();
    }
    next();
  };
}

/** Allow access when the user holds ANY of the given permissions. */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw unauthorized();
    if (!permissions.some((p) => hasPermission(req.user!.role, p))) {
      throw forbidden();
    }
    next();
  };
}
