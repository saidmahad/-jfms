import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../lib/utils.ts';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-danger" />,
  info: <Info className="h-5 w-5 text-petrol-500 dark:text-petrol-300" />,
  warning: <AlertTriangle className="h-5 w-5 text-energy-500" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, type, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'card flex items-start gap-3 p-4 animate-slide-in-right border-l-4',
              t.type === 'success' && 'border-l-success',
              t.type === 'error' && 'border-l-danger',
              t.type === 'warning' && 'border-l-energy-500',
              t.type === 'info' && 'border-l-petrol-500',
            )}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
            <p className="flex-1 text-sm text-petrol-800 dark:text-slate-100">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-petrol-400 hover:text-petrol-600 dark:hover:text-slate-300"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
