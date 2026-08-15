import type { Request, Response } from 'express';
import { db, type SqlValue } from '../db/index.ts';
import { toCamelList } from '../utils/case.ts';

export function listAuditLogs(req: Request, res: Response): void {
  const q = req.query as Record<string, string | undefined>;
  const page = Math.max(1, Number(q.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(q.perPage ?? 20)));
  const where: string[] = [];
  const params: SqlValue[] = [];

  if (q.module) { where.push('a.module = ?'); params.push(q.module); }
  if (q.action) { where.push('a.action LIKE ?'); params.push(`%${q.action}%`); }
  if (q.userId) { where.push('a.user_id = ?'); params.push(Number(q.userId)); }
  if (q.from) { where.push('a.created_at >= ?'); params.push(q.from); }
  if (q.to) { where.push('a.created_at <= ?'); params.push(q.to); }
  if (q.search) {
    where.push('(a.action LIKE ? OR a.module LIKE ? OR u.username LIKE ?)');
    const like = `%${q.search}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) AS c FROM audit_logs a ${whereSql}`).get(...params) as { c: number };

  const rows = db.prepare(
    `SELECT a.*, u.username AS username
     FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
     ${whereSql} ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`,
  ).all(...params, perPage, (page - 1) * perPage) as Record<string, unknown>[];

  res.json({
    success: true,
    message: 'Audit logs loaded',
    data: {
      items: toCamelList(rows).map((r) => ({
        ...r,
        oldValues: r.oldValues ? safeParse(r.oldValues) : null,
        newValues: r.newValues ? safeParse(r.newValues) : null,
      })),
      total: countRow.c,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(countRow.c / perPage)),
    },
  });
}

function safeParse(json: unknown): unknown {
  try {
    return JSON.parse(String(json));
  } catch {
    return String(json);
  }
}
