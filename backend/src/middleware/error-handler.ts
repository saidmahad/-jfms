import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors.ts';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  // Database constraint violations become friendly 409s.
  const message = err instanceof Error ? err.message : 'Unknown error';
  if (message.includes('UNIQUE constraint failed')) {
    res.status(409).json({ success: false, message: 'A record with the same unique value already exists' });
    return;
  }
  if (message.includes('FOREIGN KEY constraint failed')) {
    res.status(409).json({ success: false, message: 'This record is referenced by other data and cannot be modified' });
    return;
  }

  console.error('[error]', err);
  // Never leak stack traces or internals to clients.
  res.status(500).json({ success: false, message: 'Internal server error' });
}
