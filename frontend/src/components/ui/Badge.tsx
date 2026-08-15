import { cn } from '../../lib/utils.ts';

export type BadgeTone =
  | 'green'
  | 'red'
  | 'amber'
  | 'blue'
  | 'orange'
  | 'slate'
  | 'purple';

const TONES: Record<BadgeTone, string> = {
  green: 'bg-success/10 text-success border-success/20',
  red: 'bg-danger/10 text-danger border-danger/20',
  amber: 'bg-fuel-400/15 text-amber-600 border-fuel-400/30',
  orange: 'bg-energy-500/10 text-energy-600 border-energy-500/25',
  blue: 'bg-petrol-500/10 text-petrol-600 dark:text-petrol-300 border-petrol-500/20',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
  purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

export function Badge({ tone = 'slate', children, className }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'active':
    case 'paid':
    case 'ok':
      return 'green';
    case 'inactive':
    case 'cancelled':
    case 'offline':
    case 'critical':
      return 'red';
    case 'pending':
    case 'maintenance':
    case 'low':
      return 'amber';
    case 'sale':
    case 'purchase':
      return 'blue';
    case 'adjustment':
      return 'orange';
    case 'return':
      return 'purple';
    default:
      return 'slate';
  }
}
