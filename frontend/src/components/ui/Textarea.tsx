import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils.ts';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id ?? props.name;
    return (
      <div className="space-y-1.5">
        {label && <label htmlFor={textareaId} className="label">{label}</label>}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn('input min-h-[80px] resize-y', error && 'border-danger', className)}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
