import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

export function StatCard({
  label,
  value,
  icon,
  iconClass,
  change,
  changeLabel,
  description,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconClass?: string;
  change?: number;
  changeLabel?: string;
  description?: string;
  accent?: boolean;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <div
      className={cn(
        'card relative overflow-hidden p-5 transition-shadow hover:shadow-card-hover',
        accent && 'bg-petroleum-gradient text-white border-transparent',
      )}
    >
      {accent && (
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-energy-500/20 blur-2xl" />
      )}
      <div className="flex items-center justify-between">
        <p className={cn('text-xs font-semibold uppercase tracking-wider', accent ? 'text-petrol-200' : 'text-petrol-500 dark:text-petrol-400')}>
          {label}
        </p>
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            iconClass ?? 'bg-petrol-500/10 text-petrol-600 dark:text-petrol-300',
            accent && 'bg-white/15 text-white',
          )}
        >
          {icon}
        </span>
      </div>
      <p className={cn('mt-3 font-display text-[28px] font-extrabold leading-none tracking-tight', accent ? 'text-white' : 'text-petrol-900 dark:text-white')}>
        {value}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold',
              up ? 'text-success' : 'text-danger',
              accent && 'bg-white/15',
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {description && (
          <span className={cn('truncate text-xs', accent ? 'text-petrol-200' : 'text-petrol-400 dark:text-petrol-500')}>
            {description}
          </span>
        )}
        {changeLabel && (
          <span className={cn('text-xs', accent ? 'text-petrol-200' : 'text-petrol-400 dark:text-petrol-500')}>{changeLabel}</span>
        )}
      </div>
    </div>
  );
}
