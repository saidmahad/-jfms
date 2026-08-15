import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className={tone === 'danger' ? 'h-5 w-5 text-danger' : 'h-5 w-5 text-energy-500'} />
          {title}
        </span>
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-petrol-600 dark:text-slate-300">{message}</p>
    </Modal>
  );
}
