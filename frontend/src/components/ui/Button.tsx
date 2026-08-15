import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-energy-500 text-white hover:bg-energy-600 focus-visible:ring-energy-500/50 shadow-sm disabled:bg-energy-400/60',
  secondary:
    'bg-petrol-800 text-white hover:bg-petrol-700 focus-visible:ring-petrol-500/50 shadow-sm disabled:bg-petrol-800/60',
  outline:
    'border border-petrol-200 dark:border-petrol-700 text-petrol-700 dark:text-slate-200 hover:bg-petrol-50 dark:hover:bg-petrol-800 focus-visible:ring-petrol-400/40',
  ghost:
    'text-petrol-600 dark:text-slate-300 hover:bg-petrol-100/70 dark:hover:bg-petrol-800 focus-visible:ring-petrol-400/40',
  danger: 'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger/40 shadow-sm',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
