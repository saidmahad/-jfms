import type { Request, Response } from 'express';
import { db, type DbRow, type SqlValue } from '../db/index.ts';
import { toCamel, toCamelList } from '../utils/case.ts';
import { notFound } from '../utils/errors.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';

export function listSuppliers(req: Request, res: Response): void {
  const q = req.query as Record<string, string | undefined>;
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (q.search) {
    where.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)');
    const like = `%${q.search}%`;
    params.push(like, like, like);
  }
  if (q.status && q.status !== 'all') { where.push('status = ?'); params.push(q.status); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.prepare(
    `SELECT s.*,
            (SELECT COUNT(*) FROM inventory_transactions it WHERE it.supplier_id = s.id AND it.type = 'purchase') AS purchases,
            (SELECT COALESCE(SUM(it.quantity), 0) FROM inventory_transactions it WHERE it.supplier_id = s.id AND it.type = 'purchase') AS total_quantity
     FROM suppliers s ${whereSql} ORDER BY s.name ASC`,
  ).all(...params) as Record<string, unknown>[];

  res.json({ success: true, message: 'Suppliers loaded', data: toCamelList(rows) });
}

export function getSupplier(req: Request, res: Response): void {
  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id) as Record<string, unknown> | undefined;
  if (!supplier) throw notFound('Supplier not found');

  const history = db.prepare(
    `SELECT it.*, f.name AS fuel_name, u.username AS created_by_name
     FROM inventory_transactions it
     JOIN fuels f ON f.id = it.fuel_id
     LEFT JOIN users u ON u.id = it.created_by
     WHERE it.supplier_id = ? AND it.type = 'purchase'
     ORDER BY it.created_at DESC LIMIT 50`,
  ).all(req.params.id) as Record<string, unknown>[];

  res.json({
    success: true,
    message: 'Supplier loaded',
    data: { supplier: toCamel(supplier), history: toCamelList(history) },
  });
}

export function createSupplier(req: Request, res: Response): void {
  const body = req.body as { name: string; phone?: string | null; email?: string | null; address?: string | null; status?: string };
  const r = db.prepare(
    `INSERT INTO suppliers (name, phone, email, address, status) VALUES (?, ?, ?, ?, ?)`,
  ).run(body.name, body.phone ?? null, body.email ?? null, body.address ?? null, body.status ?? 'active');
  const id = Number(r.lastInsertRowid);

  logAudit(auditContext(req), { action: 'create_supplier', module: 'suppliers', recordId: id, newValues: body });
  res.status(201).json({
    success: true,
    message: 'Supplier created successfully',
    data: toCamel(db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id) as Record<string, unknown>),
  });
}

export function updateSupplier(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Supplier not found');

  const body = req.body as { name?: string; phone?: string | null; email?: string | null; address?: string | null; status?: string };
  db.prepare(
    `UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, status = ? WHERE id = ?`,
  ).run(
    body.name ?? existing.name,
    body.phone !== undefined ? body.phone : existing.phone,
    body.email !== undefined ? body.email : existing.email,
    body.address !== undefined ? body.address : existing.address,
    body.status ?? existing.status,
    req.params.id,
  );

  logAudit(auditContext(req), {
    action: 'update_supplier',
    module: 'suppliers',
    recordId: Number(req.params.id),
    oldValues: existing,
    newValues: body,
  });

  res.json({
    success: true,
    message: 'Supplier updated successfully',
    data: toCamel(db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id) as Record<string, unknown>),
  });
}

export function deleteSupplier(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Supplier not found');

  // Soft-deactivate instead of hard delete when purchases exist.
  const purchaseCount = db.prepare(
    `SELECT COUNT(*) AS c FROM inventory_transactions WHERE supplier_id = ?`,
  ).get(req.params.id) as { c: number };

  if (Number(purchaseCount.c) > 0) {
    db.prepare(`UPDATE suppliers SET status = 'inactive' WHERE id = ?`).run(req.params.id);
    logAudit(auditContext(req), { action: 'deactivate_supplier', module: 'suppliers', recordId: Number(req.params.id), newValues: { status: 'inactive' } });
    res.json({ success: true, message: 'Supplier deactivated (has purchase history)', data: null });
    return;
  }

  db.prepare(`DELETE FROM suppliers WHERE id = ?`).run(req.params.id);
  logAudit(auditContext(req), { action: 'delete_supplier', module: 'suppliers', recordId: Number(req.params.id), oldValues: existing });
  res.json({ success: true, message: 'Supplier deleted', data: null });
}
