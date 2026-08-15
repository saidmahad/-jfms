import type { Request, Response } from 'express';
import { db, transaction, type SqlValue } from '../db/index.ts';
import type { DbRow } from '../db/index.ts';
import { toCamel, toCamelList } from '../utils/case.ts';
import { badRequest, notFound } from '../utils/errors.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';
import { evaluateStockLevel } from '../services/notification.service.ts';

function serializeFuel(row: Record<string, unknown>) {
  const fuel = toCamel(row);
  return {
    ...fuel,
    stockLevel: evaluateStockLevel({
      id: fuel.id as number,
      name: fuel.name as string,
      currentQuantity: fuel.currentQuantity as number,
      minimumStock: fuel.minimumStock as number,
    }),
  };
}

export function listFuels(req: Request, res: Response): void {
  const q = req.query as Record<string, string | undefined>;
  const page = Math.max(1, Number(q.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(q.perPage ?? 20)));
  const where: string[] = [];
  const params: SqlValue[] = [];

  if (q.search) {
    where.push('(name LIKE ? OR type LIKE ?)');
    const like = `%${q.search}%`;
    params.push(like, like);
  }
  if (q.status && q.status !== 'all') {
    where.push('status = ?');
    params.push(q.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) AS c FROM fuels ${whereSql}`).get(...params) as { c: number };
  const rows = db.prepare(
    `SELECT * FROM fuels ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`,
  ).all(...params, perPage, (page - 1) * perPage) as Record<string, unknown>[];

  res.json({
    success: true,
    message: 'Fuels loaded',
    data: {
      items: rows.map(serializeFuel),
      total: countRow.c,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(countRow.c / perPage)),
    },
  });
}

export function getFuel(req: Request, res: Response): void {
  const row = db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) throw notFound('Fuel not found');

  const priceHistory = db.prepare(
    `SELECT fph.*, u.username AS changed_by_name
     FROM fuel_price_history fph LEFT JOIN users u ON u.id = fph.changed_by
     WHERE fph.fuel_id = ? ORDER BY fph.created_at DESC LIMIT 20`,
  ).all(req.params.id) as Record<string, unknown>[];

  res.json({
    success: true,
    message: 'Fuel loaded',
    data: { fuel: serializeFuel(row), priceHistory: toCamelList(priceHistory) },
  });
}

export function createFuel(req: Request, res: Response): void {
  const body = req.body as {
    name: string;
    type: string;
    pricePerLitre: number;
    currentQuantity?: number;
    minimumStock?: number;
    maximumCapacity?: number;
    status?: string;
  };

  let id = 0;
  transaction(() => {
    const r = db.prepare(
      `INSERT INTO fuels (name, type, price_per_litre, current_quantity, minimum_stock, maximum_capacity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      body.name,
      body.type,
      body.pricePerLitre,
      body.currentQuantity ?? 0,
      body.minimumStock ?? 0,
      body.maximumCapacity ?? 0,
      body.status ?? 'active',
    );
    id = Number(r.lastInsertRowid);

    db.prepare(
      `INSERT INTO fuel_price_history (fuel_id, old_price, new_price, changed_by) VALUES (?, 0, ?, ?)`,
    ).run(id, body.pricePerLitre, req.user!.id);
  });

  logAudit(auditContext(req), { action: 'create_fuel', module: 'fuels', recordId: id, newValues: body });
  res.status(201).json({ success: true, message: 'Fuel created successfully', data: serializeFuel(db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(id) as Record<string, unknown>) });
}

export function updateFuel(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Fuel not found');

  const body = req.body as {
    name: string;
    type: string;
    pricePerLitre: number;
    currentQuantity?: number;
    minimumStock?: number;
    maximumCapacity?: number;
    status?: string;
  };

  let priceChanged = false;
  transaction(() => {
    db.prepare(
      `UPDATE fuels SET name = ?, type = ?, price_per_litre = ?, current_quantity = ?, minimum_stock = ?, maximum_capacity = ?, status = ? WHERE id = ?`,
    ).run(
      body.name,
      body.type,
      body.pricePerLitre,
      body.currentQuantity ?? existing.current_quantity,
      body.minimumStock ?? existing.minimum_stock,
      body.maximumCapacity ?? existing.maximum_capacity,
      body.status ?? existing.status,
      req.params.id,
    );
    if (Number(existing.price_per_litre) !== body.pricePerLitre) {
      priceChanged = true;
      db.prepare(
        `INSERT INTO fuel_price_history (fuel_id, old_price, new_price, changed_by) VALUES (?, ?, ?, ?)`,
      ).run(req.params.id, existing.price_per_litre, body.pricePerLitre, req.user!.id);
    }
  });

  logAudit(auditContext(req), {
    action: priceChanged ? 'update_fuel_price' : 'update_fuel',
    module: 'fuels',
    recordId: Number(req.params.id),
    oldValues: existing,
    newValues: body,
  });

  res.json({ success: true, message: priceChanged ? 'Fuel updated and price change recorded' : 'Fuel updated successfully', data: serializeFuel(db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(req.params.id) as Record<string, unknown>) });
}

export function updateFuelPrice(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Fuel not found');

  const newPrice = (req.body as { pricePerLitre: number }).pricePerLitre;
  if (newPrice <= 0) throw badRequest('Price per litre must be greater than zero');

  transaction(() => {
    db.prepare(`UPDATE fuels SET price_per_litre = ? WHERE id = ?`).run(newPrice, req.params.id);
    db.prepare(
      `INSERT INTO fuel_price_history (fuel_id, old_price, new_price, changed_by) VALUES (?, ?, ?, ?)`,
    ).run(req.params.id, existing.price_per_litre, newPrice, req.user!.id);
  });

  logAudit(auditContext(req), {
    action: 'change_fuel_price',
    module: 'fuels',
    recordId: Number(req.params.id),
    oldValues: { pricePerLitre: existing.price_per_litre },
    newValues: { pricePerLitre: newPrice },
  });

  res.json({
    success: true,
    message: `Price updated from ${Number(existing.price_per_litre)} to ${newPrice} per litre`,
    data: serializeFuel(db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(req.params.id) as Record<string, unknown>),
  });
}

export function updateFuelStatus(req: Request, res: Response): void {
  const existing = db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(req.params.id) as DbRow | undefined;
  if (!existing) throw notFound('Fuel not found');

  const status = (req.body as { status: string }).status;
  db.prepare(`UPDATE fuels SET status = ? WHERE id = ?`).run(status, req.params.id);

  logAudit(auditContext(req), {
    action: status === 'active' ? 'activate_fuel' : 'deactivate_fuel',
    module: 'fuels',
    recordId: Number(req.params.id),
    oldValues: { status: existing.status },
    newValues: { status },
  });

  res.json({
    success: true,
    message: `${existing.name} ${status === 'active' ? 'activated' : 'deactivated'}`,
    data: serializeFuel(db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(req.params.id) as Record<string, unknown>),
  });
}
