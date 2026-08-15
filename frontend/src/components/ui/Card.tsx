import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils.ts';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-petrol-100 dark:border-petrol-800 px-5 py-4', className)}>
      <div>
        <h3 className="font-display text-base font-bold text-petrol-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-petrol-500 dark:text-petrol-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
