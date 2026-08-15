import { db } from '../db/index.ts';

export type NotificationType = 'low_stock' | 'critical_stock' | 'sale' | 'login' | 'error' | 'admin' | 'system';

interface CreateNotificationInput {
  userId?: number | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}

export function createNotification({ userId = null, type, title, message, link = null }: CreateNotificationInput): void {
  db.prepare(
    `INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`,
  ).run(userId, type, title, message, link);
}

export interface FuelLevel {
  id: number;
  name: string;
  currentQuantity: number;
  minimumStock: number;
}

/** LOW STOCK when current <= minimum. CRITICAL when current <= 25% of minimum. */
export function evaluateStockLevel(fuel: FuelLevel): { status: 'ok' | 'low' | 'critical'; label: string } {
  if (fuel.currentQuantity <= fuel.minimumStock * 0.25) return { status: 'critical', label: 'CRITICAL STOCK' };
  if (fuel.currentQuantity <= fuel.minimumStock) return { status: 'low', label: 'LOW STOCK' };
  return { status: 'ok', label: 'IN STOCK' };
}

/** Create a low/critical stock notification for a fuel, deduplicating unread alerts. */
export function alertLowStock(fuel: FuelLevel): void {
  const { status } = evaluateStockLevel(fuel);
  if (status === 'ok') return;

  const link = `/inventory?fuel=${fuel.id}`;
  const existing = db.prepare(
    `SELECT id FROM notifications WHERE type IN ('low_stock', 'critical_stock') AND link = ? AND is_read = 0 LIMIT 1`,
  ).get(link) as { id: number } | undefined;

  if (existing) return;

  const critical = status === 'critical';
  const min = fuel.minimumStock.toLocaleString();
  const level = critical ? 'CRITICAL STOCK' : 'LOW STOCK';
  createNotification({
    type: critical ? 'critical_stock' : 'low_stock',
    title: `${fuel.name} — ${level}`,
    message: `${fuel.name} is at ${fuel.currentQuantity.toLocaleString()} L, below the minimum stock level of ${min} L.`,
    link,
  });
}

export function listNotifications(userId: number, { limit = 50, unreadOnly = false }: { limit?: number; unreadOnly?: boolean } = {}) {
  const rows = db.prepare(
    `SELECT n.* FROM notifications n
     WHERE (n.user_id = ? OR n.user_id IS NULL)
     ${unreadOnly ? 'AND n.is_read = 0' : ''}
     ORDER BY n.created_at DESC
     LIMIT ?`,
  ).all(userId, limit) as Record<string, unknown>[];
  return rows;
}

export function unreadNotificationCount(userId: number): number {
  const row = db.prepare(
    `SELECT COUNT(*) AS c FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
  ).get(userId) as { c: number };
  return row.c;
}

export function markNotificationRead(id: number, userId: number): boolean {
  const r = db.prepare(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
  ).run(id, userId);
  return Number(r.changes) > 0;
}

export function markAllNotificationsRead(userId: number): number {
  const r = db.prepare(
    `UPDATE notifications SET is_read = 1 WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0`,
  ).run(userId);
  return Number(r.changes);
}
