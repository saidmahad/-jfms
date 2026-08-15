import type { Request, Response } from 'express';
import { listNotifications, markAllNotificationsRead, markNotificationRead, unreadNotificationCount } from '../services/notification.service.ts';

export function listNotificationsController(req: Request, res: Response): void {
  const userId = req.user!.id;
  const unreadOnly = req.query.unread === 'true';
  const limit = Math.min(100, Number(req.query.limit ?? 50));
  res.json({
    success: true,
    message: 'Notifications loaded',
    data: {
      items: listNotifications(userId, { limit, unreadOnly }),
      unreadCount: unreadNotificationCount(userId),
    },
  });
}

export function unreadCountController(req: Request, res: Response): void {
  res.json({
    success: true,
    message: 'OK',
    data: { unreadCount: unreadNotificationCount(req.user!.id) },
  });
}

export function markReadController(req: Request, res: Response): void {
  const ok = markNotificationRead(Number(req.params.id), req.user!.id);
  res.json({ success: true, message: ok ? 'Notification marked as read' : 'Notification not found', data: null });
}

export function markAllReadController(req: Request, res: Response): void {
  const count = markAllNotificationsRead(req.user!.id);
  res.json({ success: true, message: `${count} notification${count === 1 ? '' : 's'} marked as read`, data: { count } });
}
