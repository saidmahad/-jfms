import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Save, Settings as SettingsIcon, ShieldAlert } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Select } from '../components/ui/Select.tsx';
import { PageLoader } from '../components/ui/Spinner.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { hasPermission } from '../lib/permissions.ts';
import type { Settings } from '../types/index.ts';

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'INR', label: 'INR — Indian Rupee' },
];

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Africa/Lagos', 'Africa/Nairobi', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney'];

export default function SettingsPage() {
  const { user, refreshSession } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const canEdit = user ? hasPermission(user.role, 'settings.manage') : false;

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<{ data: Settings }>('/settings')).data.data,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      for (const [key, value] of Object.entries(form)) {
        if (value !== undefined && value !== null) payload[key] = value;
      }
      const res = await api.put<{ data: Settings }>('/settings', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast('Settings updated successfully', 'success');
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      if (data.theme === 'light' || data.theme === 'dark') setTheme(data.theme);
      // Refresh session settings (currency/timezone) used by the formatters.
      refreshSession();
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  if (settingsQuery.isLoading) return <PageLoader />;
  if (settingsQuery.isError) return <ErrorState message={errorMessage(settingsQuery.error)} onRetry={() => settingsQuery.refetch()} />;

  const settings = settingsQuery.data;

  // Sync the local form when settings load.
  useEffect(() => {
    if (settings) {
      setForm({
        stationName: settings.station_name,
        stationAddress: settings.station_address,
        stationPhone: settings.station_phone,
        stationEmail: settings.station_email,
        currency: settings.currency,
        timezone: settings.timezone,
        receiptFooter: settings.receipt_footer,
        lowStockThreshold: settings.low_stock_threshold,
        theme: settings.theme,
        notifyLowStock: settings.notify_low_stock,
      });
    }
  }, [settings]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Station configuration, currency and preferences"
        actions={
          canEdit ? (
            <Button onClick={() => saveSettings.mutate()} loading={saveSettings.isPending}>
              {saved ? 'Saved ✓' : <><Save className="h-4 w-4" /> Save Settings</>}
            </Button>
          ) : undefined
        }
      />

      {!canEdit && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
          <ShieldAlert className="h-5 w-5" />
          Only administrators can modify system settings.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Station Information" subtitle="Shown on receipts and reports" />
          <CardBody className="space-y-4">
            <Input label="Station name" value={form.stationName ?? ''} onChange={(e) => set('stationName', e.target.value)} disabled={!canEdit} />
            <Input label="Station address" value={form.stationAddress ?? ''} onChange={(e) => set('stationAddress', e.target.value)} disabled={!canEdit} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone" value={form.stationPhone ?? ''} onChange={(e) => set('stationPhone', e.target.value)} disabled={!canEdit} />
              <Input label="Email" type="email" value={form.stationEmail ?? ''} onChange={(e) => set('stationEmail', e.target.value)} disabled={!canEdit} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Financial" subtitle="Currency and operating thresholds" />
          <CardBody className="space-y-4">
            <Select label="Currency" value={form.currency ?? 'USD'} onChange={(e) => set('currency', e.target.value)} options={CURRENCIES} disabled={!canEdit} />
            <Select label="Timezone" value={form.timezone ?? 'UTC'} onChange={(e) => set('timezone', e.target.value)} options={TIMEZONES.map((t) => ({ value: t, label: t }))} disabled={!canEdit} />
            <Input label="Low-stock threshold (default litres)" value={form.lowStockThreshold ?? ''} onChange={(e) => set('lowStockThreshold', e.target.value)} disabled={!canEdit} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Receipt & Notifications" />
          <CardBody className="space-y-4">
            <Input label="Receipt footer" value={form.receiptFooter ?? ''} onChange={(e) => set('receiptFooter', e.target.value)} disabled={!canEdit} />
            <Select
              label="Low stock notifications"
              value={form.notifyLowStock ?? 'true'}
              onChange={(e) => set('notifyLowStock', e.target.value)}
              options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]}
              disabled={!canEdit}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Appearance" />
          <CardBody className="space-y-4">
            <Select
              label="Theme"
              value={form.theme ?? theme}
              onChange={(e) => { set('theme', e.target.value); setTheme(e.target.value as 'light' | 'dark'); }}
              options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
              disabled={!canEdit}
            />
            <p className="flex items-center gap-2 text-sm text-petrol-500 dark:text-petrol-400">
              <SettingsIcon className="h-4 w-4" />
              Your theme preference is also saved on this device.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
