import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertTriangle, ShoppingCart, LogIn, ShieldAlert, Info } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatDateTime } from '../lib/format.ts';
import { cn } from '../lib/utils.ts';
import type { NotificationItem } from '../types/index.ts';

const ICONS = {
  low_stock: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  critical_stock: <AlertTriangle className="h-4 w-4 text-danger" />,
  sale: <ShoppingCart className="h-4 w-4 text-success" />,
  login: <LogIn className="h-4 w-4 text-petrol-500" />,
  error: <ShieldAlert className="h-4 w-4 text-danger" />,
  admin: <Info className="h-4 w-4 text-energy-500" />,
  system: <Info className="h-4 w-4 text-slate-500" />,
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const notificationsQuery = useQuery({
    queryKey: ['notifications', { all: true }],
    queryFn: async () => {
      const res = await api.get<{ data: { items: NotificationItem[]; unreadCount: number } }>('/notifications', { params: { limit: 100 } });
      return res.data.data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      toast('All notifications marked as read', 'success');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const data = notificationsQuery.data;

  const open = (n: NotificationItem) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="System alerts and activity"
        actions={
          (data?.unreadCount ?? 0) > 0 ? (
            <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {notificationsQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : notificationsQuery.isError ? (
        <ErrorState message={errorMessage(notificationsQuery.error)} onRetry={() => notificationsQuery.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications" description="Alerts for low stock, sales, logins and system events will appear here." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-petrol-100 dark:divide-petrol-800">
            {data.items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => open(n)}
                  className={cn(
                    'flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-petrol-50 dark:hover:bg-petrol-800/60',
                    !n.isRead && 'bg-energy-500/[0.04]',
                  )}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-petrol-100 dark:bg-petrol-800">
                    {ICONS[n.type] ?? <Info className="h-4 w-4 text-petrol-400" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-petrol-900 dark:text-white">{n.title}</span>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-energy-500" />}
                    </span>
                    <span className="mt-0.5 block text-sm text-petrol-500 dark:text-petrol-400">{n.message}</span>
                    <span className="mt-1 block text-xs text-petrol-400">{formatDateTime(n.createdAt)}</span>
                  </span>
                  {n.link && <span className="shrink-0 text-xs font-semibold text-energy-600">View →</span>}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
