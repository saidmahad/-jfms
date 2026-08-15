import type { Request, Response } from 'express';
import { getSettings, updateSettings } from '../services/settings.service.ts';
import { logAudit, auditContext } from '../services/audit.service.ts';

const KEY_MAP: Record<string, string> = {
  stationName: 'station_name',
  stationAddress: 'station_address',
  stationPhone: 'station_phone',
  stationEmail: 'station_email',
  currency: 'currency',
  timezone: 'timezone',
  receiptFooter: 'receipt_footer',
  lowStockThreshold: 'low_stock_threshold',
  theme: 'theme',
  notifyLowStock: 'notify_low_stock',
};

export function getSettingsController(_req: Request, res: Response): void {
  res.json({ success: true, message: 'Settings loaded', data: getSettings() });
}

export function updateSettingsController(req: Request, res: Response): void {
  const body = req.body as Record<string, string>;
  const patch: Record<string, string> = {};
  const before = getSettings();

  for (const [camelKey, value] of Object.entries(body)) {
    const dbKey = KEY_MAP[camelKey];
    if (dbKey && value !== undefined) patch[dbKey] = String(value);
  }

  if (Object.keys(patch).length === 0) {
    res.json({ success: true, message: 'No settings changed', data: before });
    return;
  }

  const after = updateSettings(patch, req.user!.id);

  logAudit(auditContext(req), {
    action: 'update_settings',
    module: 'settings',
    oldValues: patch,
    newValues: patch,
  });

  res.json({ success: true, message: 'Settings updated successfully', data: after });
}
