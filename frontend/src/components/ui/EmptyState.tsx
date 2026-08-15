import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-petrol-100 dark:bg-petrol-800 text-petrol-400 dark:text-petrol-500">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <div>
        <p className="font-display text-base font-semibold text-petrol-800 dark:text-slate-100">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-petrol-500 dark:text-petrol-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
