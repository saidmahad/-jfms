import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideClose?: boolean;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', hideClose }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Dialog'}
    >
      <div className="absolute inset-0 bg-petrol-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        ref={panelRef}
        className={cn(
          'relative w-full rounded-t-2xl sm:rounded-2xl bg-white dark:bg-petrol-900 shadow-2xl animate-slide-up max-h-[92vh] flex flex-col',
          SIZES[size],
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-petrol-100 dark:border-petrol-800 px-5 py-4">
            <div>
              {title && <h2 className="font-display text-lg font-bold text-petrol-900 dark:text-white">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-xs text-petrol-500 dark:text-petrol-400">{subtitle}</p>}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-petrol-400 hover:bg-petrol-100 dark:hover:bg-petrol-800 hover:text-petrol-600 dark:hover:text-slate-200"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-petrol-100 dark:border-petrol-800 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
