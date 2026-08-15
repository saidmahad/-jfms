import { db, transaction } from '../db/index.ts';

export const SETTING_DEFAULTS: Record<string, string> = {
  station_name: 'JUPA Fuel Station',
  station_address: '1 Main Street, Fuel City',
  station_phone: '',
  station_email: '',
  currency: 'USD',
  timezone: 'UTC',
  receipt_footer: 'Thank you for choosing JUPA.',
  low_stock_threshold: '500',
  theme: 'light',
  notify_low_stock: 'true',
};

export function getSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  return { ...SETTING_DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

export function getSetting(key: string): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? SETTING_DEFAULTS[key] ?? '';
}

export function updateSettings(patch: Record<string, string>, updatedBy: number | null): Record<string, string> {
  transaction(() => {
    const stmt = db.prepare(
      `INSERT INTO settings (key, value, updated_by) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by`,
    );
    for (const [key, value] of Object.entries(patch)) {
      stmt.run(key, String(value), updatedBy);
    }
  });
  return getSettings();
}
