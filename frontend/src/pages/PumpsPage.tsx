import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Gauge, MapPin } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge, statusTone } from '../components/ui/Badge.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { Skeleton } from '../components/ui/Skeleton.tsx';
import { formatCurrency, formatDateTime, formatLitres } from '../lib/format.ts';
import { cn } from '../lib/utils.ts';
import type { Employee, Fuel, Pump } from '../types/index.ts';

const pumpSchema = z.object({
  pumpNumber: z.string().min(1, 'Pump number is required'),
  fuelId: z.coerce.number().optional().nullable(),
  currentReading: z.coerce.number().min(0).default(0),
  status: z.enum(['active', 'inactive', 'maintenance', 'offline']),
  assignedEmployeeId: z.coerce.number().optional().nullable(),
  location: z.string().optional().nullable(),
});

type PumpForm = z.infer<typeof pumpSchema>;

const STATUS_TONE: Record<string, string> = {
  active: 'bg-success',
  inactive: 'bg-slate-400',
  maintenance: 'bg-amber-500',
  offline: 'bg-danger',
};

export default function PumpsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pump | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pump | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PumpForm>({ resolver: zodResolver(pumpSchema) });

  const pumpsQuery = useQuery({
    queryKey: ['pumps'],
    queryFn: async () => (await api.get<{ data: Pump[] }>('/pumps')).data.data,
  });

  const fuelsQuery = useQuery({
    queryKey: ['fuels', { pumpForm: true }],
    queryFn: async () => (await api.get<{ data: { items: Fuel[] } }>('/fuels', { params: { perPage: 100 } })).data.data.items,
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', { pumpForm: true }],
    queryFn: async () => (await api.get<{ data: Employee[] }>('/employees')).data.data,
    enabled: user?.role !== 'ATTENDANT',
  });

  const savePump = useMutation({
    mutationFn: async (values: PumpForm) => {
      if (editing) {
        const res = await api.put<{ data: Pump }>(`/pumps/${editing.id}`, values);
        return res.data.data;
      }
      const res = await api.post<{ data: Pump }>('/pumps', values);
      return res.data.data;
    },
    onSuccess: () => {
      toast(editing ? 'Pump updated' : 'Pump created', 'success');
      setModalOpen(false);
      setEditing(null);
      reset();
      queryClient.invalidateQueries({ queryKey: ['pumps'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const deletePump = useMutation({
    mutationFn: async () => {
      await api.delete(`/pumps/${deleteTarget!.id}`);
    },
    onSuccess: () => {
      toast('Pump deleted', 'success');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['pumps'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ pumpNumber: '', fuelId: null, currentReading: 0, status: 'active', assignedEmployeeId: null, location: '' });
    setModalOpen(true);
  };

  const openEdit = (p: Pump) => {
    setEditing(p);
    reset({
      pumpNumber: p.pumpNumber,
      fuelId: p.fuelId ?? null,
      currentReading: p.currentReading,
      status: p.status,
      assignedEmployeeId: p.assignedEmployeeId ?? null,
      location: p.location ?? '',
    });
    setModalOpen(true);
  };

  const pumps = pumpsQuery.data;

  return (
    <div>
      <PageHeader
        title={user?.role === 'ATTENDANT' ? 'My Pump' : 'Pump Management'}
        description="Dispensing units, readings and status"
        actions={
          user?.role !== 'ATTENDANT' && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Pump
            </Button>
          )
        }
      />

      {pumpsQuery.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : pumpsQuery.isError ? (
        <ErrorState message={errorMessage(pumpsQuery.error)} onRetry={() => pumpsQuery.refetch()} />
      ) : !pumps || pumps.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Gauge className="h-7 w-7" />}
            title="No pumps found"
            description="Add a pump and assign it a fuel to start processing sales."
            action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Pump</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {pumps.map((p) => (
            <div
              key={p.id}
              className={cn(
                'group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-card transition-all hover:shadow-card-hover dark:bg-petrol-900',
                p.status === 'active' ? 'border-petrol-100 dark:border-petrol-800' : 'border-petrol-100/60 dark:border-petrol-800/60 opacity-80',
              )}
            >
              <div className={cn('absolute inset-x-0 top-0 h-1', STATUS_TONE[p.status] ?? 'bg-slate-400')} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-extrabold tracking-wide text-petrol-900 dark:text-white">{p.pumpNumber}</p>
                  <p className="text-xs capitalize text-petrol-400">{p.fuelName ?? 'No fuel assigned'}</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-petrol-100 dark:bg-petrol-800 text-petrol-500 dark:text-petrol-300">
                  <Gauge className="h-5 w-5" />
                </span>
              </div>

              <Badge tone={statusTone(p.status)} className="mt-3">{p.status}</Badge>

              <div className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-petrol-400">Current Reading</span>
                  <span className="font-bold text-petrol-900 dark:text-white">{formatLitres(p.currentReading)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-petrol-400">Today's Sales</span>
                  <span className="font-semibold text-success">{p.todaySales} sales</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-petrol-400">Today's Revenue</span>
                  <span className="font-semibold text-petrol-900 dark:text-white">{formatCurrency(p.todayRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-petrol-400">Last Transaction</span>
                  <span className="font-medium text-petrol-500 dark:text-petrol-300">{p.lastTransactionAt ? formatDateTime(p.lastTransactionAt) : '—'}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-petrol-400">
                  <MapPin className="h-3 w-3" /> {p.location ?? 'Unassigned location'} · {p.assignedEmployeeName ?? 'No attendant'}
                </div>
              </div>

              {user?.role !== 'ATTENDANT' && (
                <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => setDeleteTarget(p)} aria-label="Delete pump">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.pumpNumber}` : 'Add Pump'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit((v) => savePump.mutate(v))} loading={savePump.isPending}>
              {editing ? 'Save Changes' : 'Create Pump'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit((v) => savePump.mutate(v))} className="grid grid-cols-2 gap-4" noValidate>
          <div>
            <Input label="Pump number" placeholder="PUMP-05" error={errors.pumpNumber?.message} {...register('pumpNumber')} />
          </div>
          <div>
            <Select
              label="Fuel type"
              placeholder="No fuel"
              error={errors.fuelId?.message}
              options={(fuelsQuery.data ?? []).map((f) => ({ value: f.id, label: `${f.name} (${formatCurrency(f.pricePerLitre)})` }))}
              {...register('fuelId')}
            />
          </div>
          <div>
            <Input type="number" step="0.1" label="Current reading (L)" error={errors.currentReading?.message} {...register('currentReading')} />
          </div>
          <div>
            <Select
              label="Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'offline', label: 'Offline' },
              ]}
              {...register('status')}
            />
          </div>
          <div>
            <Input label="Location / position" placeholder="Bay A" {...register('location')} />
          </div>
          {user?.role !== 'ATTENDANT' && (
            <div>
              <Select
                label="Assigned attendant"
                placeholder="Unassigned"
                options={(employeesQuery.data ?? []).map((e) => ({ value: e.id, label: e.fullName }))}
                {...register('assignedEmployeeId')}
              />
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.pumpNumber}?`}
        message={`Are you sure you want to delete ${deleteTarget?.pumpNumber}? Pumps with recorded sales cannot be deleted.`}
        confirmLabel="Delete"
        loading={deletePump.isPending}
        onConfirm={() => deletePump.mutate()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
