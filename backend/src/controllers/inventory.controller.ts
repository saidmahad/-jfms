import type { Request, Response } from 'express';
import { db } from '../db/index.ts';
import { toCamelList } from '../utils/case.ts';
import { adjustStock, listLowStock, listStockMovements, purchaseStock } from '../services/inventory.service.ts';
import { auditContext } from '../services/audit.service.ts';
import { evaluateStockLevel } from '../services/notification.service.ts';
import type { AuthUser } from '../types/express.d.ts';

export function inventoryOverview(_req: Request, res: Response): void {
  const rows = db.prepare(
    `SELECT f.*,
            COALESCE((SELECT SUM(it.quantity) FROM inventory_transactions it WHERE it.fuel_id = f.id AND it.type = 'purchase'), 0) AS total_purchased,
            COALESCE((SELECT SUM(ABS(it.quantity)) FROM inventory_transactions it WHERE it.fuel_id = f.id AND it.type = 'sale'), 0) AS total_sold
     FROM fuels f ORDER BY f.name ASC`,
  ).all() as Record<string, unknown>[];

  const summaryRow = db.prepare(
    `SELECT COUNT(*) AS fuel_count,
            COALESCE(SUM(current_quantity), 0) AS total_litres,
            COALESCE(SUM(CASE WHEN current_quantity <= minimum_stock THEN 1 ELSE 0 END), 0) AS low_count
     FROM fuels`,
  ).get() as { fuel_count: number; fuelCount: number; total_litres: number; low_count: number };

  const items = toCamelList(rows).map((f) => ({
    ...f,
    stockLevel: evaluateStockLevel({
      id: f.id as number,
      name: f.name as string,
      currentQuantity: f.currentQuantity as number,
      minimumStock: f.minimumStock as number,
    }),
  }));

  res.json({
    success: true,
    message: 'Inventory loaded',
    data: {
      summary: {
        fuelCount: Number(summaryRow.fuel_count),
        totalLitres: Math.round(Number(summaryRow.total_litres) * 100) / 100,
        lowStockCount: Number(summaryRow.low_count),
      },
      items,
    },
  });
}

export function purchaseController(req: Request, res: Response): void {
  const result = purchaseStock(req.user as AuthUser, req.body, auditContext(req));
  res.status(201).json({ success: true, message: 'Stock purchase recorded and inventory updated', data: result });
}

export function adjustmentController(req: Request, res: Response): void {
  const result = adjustStock(req.user as AuthUser, req.body, auditContext(req));
  res.json({ success: true, message: 'Stock adjustment completed', data: result });
}

export function movementsController(req: Request, res: Response): void {
  const q = req.query as Record<string, string | undefined>;
  const result = listStockMovements({
    page: Number(q.page ?? 1),
    perPage: Number(q.perPage ?? 20),
    fuelId: q.fuelId ? Number(q.fuelId) : undefined,
    type: q.type,
    from: q.from,
    to: q.to,
  });
  res.json({ success: true, message: 'Stock movements loaded', data: result });
}

export function lowStockController(_req: Request, res: Response): void {
  res.json({ success: true, message: 'Low stock items loaded', data: listLowStock() });
}
