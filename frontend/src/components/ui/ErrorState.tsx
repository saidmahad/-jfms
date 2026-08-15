import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button.tsx';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <p className="font-display text-base font-semibold text-petrol-800 dark:text-slate-100">Something went wrong</p>
        <p className="mt-1 max-w-sm text-sm text-petrol-500 dark:text-petrol-400">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      )}
    </div>
  );
}
