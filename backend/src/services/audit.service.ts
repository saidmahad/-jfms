import type { Request } from 'express';
import { db } from '../db/index.ts';

export interface AuditContext {
  userId: number | null;
  ip: string | null;
  userAgent: string | null;
}

export function auditContext(req: Request): AuditContext {
  return {
    userId: req.user?.id ?? null,
    ip: req.ip ?? null,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  };
}

export interface AuditEntry {
  action: string;
  module: string;
  recordId?: number | null;
  oldValues?: unknown;
  newValues?: unknown;
}

export function logAudit(ctx: AuditContext, entry: AuditEntry): void {
  const oldJson = entry.oldValues === undefined ? null : JSON.stringify(entry.oldValues);
  const newJson = entry.newValues === undefined ? null : JSON.stringify(entry.newValues);

  db.prepare(
    `INSERT INTO audit_logs (user_id, action, module, record_id, old_values, new_values, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    ctx.userId,
    entry.action,
    entry.module,
    entry.recordId ?? null,
    oldJson,
    newJson,
    ctx.ip,
    ctx.userAgent,
  );
}
