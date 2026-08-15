import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, History, Power, PowerOff, DollarSign, Fuel as FuelIcon } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge, statusTone } from '../components/ui/Badge.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx';
import { SearchInput } from '../components/ui/SearchInput.tsx';
import { Pagination } from '../components/ui/Pagination.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatCurrency, formatDateTime, formatLitres } from '../lib/format.ts';
import { cn } from '../lib/utils.ts';
import type { Paginated, Fuel } from '../types/index.ts';

const fuelFormSchema = z.object({
  name: z.string().min(1, 'Fuel name is required'),
  type: z.string().min(1, 'Fuel type is required'),
  pricePerLitre: z.coerce.number().positive('Price must be greater than zero'),
  currentQuantity: z.coerce.number().min(0).default(0),
  minimumStock: z.coerce.number().min(0).default(0),
  maximumCapacity: z.coerce.number().min(0).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
});

type FuelForm = z.infer<typeof fuelFormSchema>;

export default function FuelsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fuel | null>(null);
  const [priceTarget, setPriceTarget] = useState<Fuel | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [historyTarget, setHistoryTarget] = useState<Fuel | null>(null);
  const [statusTarget, setStatusTarget] = useState<Fuel | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FuelForm>({ resolver: zodResolver(fuelFormSchema) });

  const fuelsQuery = useQuery({
    queryKey: ['fuels', { page, search, statusFilter }],
    queryFn: async () => {
      const res = await api.get<{ data: Paginated<Fuel> }>('/fuels', {
        params: { page, perPage: 10, search, status: statusFilter },
      });
      return res.data.data;
    },
  });

  const priceHistoryQuery = useQuery({
    queryKey: ['fuels', 'history', historyTarget?.id],
    queryFn: async () => {
      const res = await api.get<{ data: { fuel: Fuel; priceHistory: { id: number; oldPrice: number; newPrice: number; changedByName: string | null; createdAt: string }[] } }>(
        `/fuels/${historyTarget!.id}`,
      );
      return res.data.data.priceHistory;
    },
    enabled: !!historyTarget,
  });

  const saveFuel = useMutation({
    mutationFn: async (values: FuelForm) => {
      if (editing) {
        const res = await api.put<{ data: Fuel }>(`/fuels/${editing.id}`, values);
        return res.data.data;
      }
      const res = await api.post<{ data: Fuel }>('/fuels', values);
      return res.data.data;
    },
    onSuccess: () => {
      toast(editing ? 'Fuel updated successfully' : 'Fuel created successfully', 'success');
      setModalOpen(false);
      setEditing(null);
      reset();
      queryClient.invalidateQueries({ queryKey: ['fuels'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const changePrice = useMutation({
    mutationFn: async (pricePerLitre: number) => {
      const res = await api.patch<{ data: Fuel }>(`/fuels/${priceTarget!.id}/price`, { pricePerLitre });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast(`Price updated to ${formatCurrency(data.pricePerLitre)} per litre`, 'success');
      setPriceTarget(null);
      queryClient.invalidateQueries({ queryKey: ['fuels'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const next = statusTarget!.status === 'active' ? 'inactive' : 'active';
      const res = await api.patch<{ data: Fuel }>(`/fuels/${statusTarget!.id}/status`, { status: next });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast(`${data.name} ${data.status === 'active' ? 'activated' : 'deactivated'}`, 'success');
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['fuels'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      name: '',
      type: 'petrol',
      pricePerLitre: 1,
      currentQuantity: 0,
      minimumStock: 500,
      maximumCapacity: 20000,
      status: 'active',
    });
    setModalOpen(true);
  };

  const openEdit = (fuel: Fuel) => {
    setEditing(fuel);
    reset({
      name: fuel.name,
      type: fuel.type,
      pricePerLitre: fuel.pricePerLitre,
      currentQuantity: fuel.currentQuantity,
      minimumStock: fuel.minimumStock,
      maximumCapacity: fuel.maximumCapacity,
      status: fuel.status,
    });
    setModalOpen(true);
  };

  const data = fuelsQuery.data;

  return (
    <div>
      <PageHeader
        title="Fuel Management"
        description="Fuel types, prices and stock levels"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Fuel
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search fuel name or type…" />
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            placeholder="All statuses"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </Card>

      {fuelsQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : fuelsQuery.isError ? (
        <ErrorState message={errorMessage(fuelsQuery.error)} onRetry={() => fuelsQuery.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FuelIcon className="h-7 w-7" />}
            title="No fuels found"
            description="Add petrol, diesel, or other fuel types to start managing prices and stock."
            action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Fuel</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">Fuel</th>
                  <th className="table-head px-4 py-3 text-left">Type</th>
                  <th className="table-head px-4 py-3 text-right">Price / L</th>
                  <th className="table-head px-4 py-3 text-right">Stock</th>
                  <th className="table-head px-4 py-3 text-right">Min / Max</th>
                  <th className="table-head px-4 py-3 text-left">Level</th>
                  <th className="table-head px-4 py-3 text-left">Status</th>
                  <th className="table-head px-4 py-3 text-left">Updated</th>
                  <th className="table-head px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((f) => (
                  <tr key={f.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                    <td className="table-cell px-5 font-semibold text-petrol-900 dark:text-white">{f.name}</td>
                    <td className="table-cell capitalize text-petrol-500 dark:text-petrol-400">{f.type}</td>
                    <td className="table-cell text-right font-semibold">{formatCurrency(f.pricePerLitre)}</td>
                    <td className="table-cell text-right">{formatLitres(f.currentQuantity)}</td>
                    <td className="table-cell text-right text-petrol-500 dark:text-petrol-400">
                      {formatLitres(f.minimumStock)} / {formatLitres(f.maximumCapacity)}
                    </td>
                    <td className="table-cell">
                      <Badge tone={statusTone(f.stockLevel?.status ?? 'ok')}>{f.stockLevel?.label}</Badge>
                    </td>
                    <td className="table-cell">
                      <Badge tone={statusTone(f.status)}>{f.status}</Badge>
                    </td>
                    <td className="table-cell text-petrol-500 dark:text-petrol-400">{formatDateTime(f.updatedAt)}</td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setHistoryTarget(f)} className="rounded-lg p-1.5 text-petrol-400 hover:bg-petrol-100 dark:hover:bg-petrol-800 hover:text-petrol-700 dark:hover:text-slate-200" title="Price history" aria-label="Price history">
                          <History className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEdit(f)} className="rounded-lg p-1.5 text-petrol-500 hover:bg-petrol-100 dark:hover:bg-petrol-800 hover:text-petrol-700 dark:hover:text-slate-200" title="Edit fuel" aria-label="Edit fuel">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setPriceTarget(f)} className="rounded-lg p-1.5 text-energy-600 hover:bg-energy-500/10" title="Change price" aria-label="Change price">
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button onClick={() => setStatusTarget(f)} className={cn('rounded-lg p-1.5 hover:bg-petrol-100 dark:hover:bg-petrol-800', f.status === 'active' ? 'text-danger' : 'text-success')} title={f.status === 'active' ? 'Deactivate' : 'Activate'} aria-label={f.status === 'active' ? 'Deactivate fuel' : 'Activate fuel'}>
                          {f.status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
        </Card>
      )}

      {/* Create / edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add Fuel'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit((v) => saveFuel.mutate(v))} loading={saveFuel.isPending}>
              {editing ? 'Save Changes' : 'Create Fuel'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit((v) => saveFuel.mutate(v))} className="grid grid-cols-2 gap-4" noValidate>
          <div className="col-span-2 sm:col-span-1">
            <Input label="Fuel name" placeholder="Petrol" error={errors.name?.message} {...register('name')} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Select
              label="Fuel type"
              error={errors.type?.message}
              options={[
                { value: 'petrol', label: 'Petrol' },
                { value: 'diesel', label: 'Diesel' },
                { value: 'gas', label: 'Gas / LPG' },
                { value: 'kerosene', label: 'Kerosene' },
                { value: 'other', label: 'Other' },
              ]}
              {...register('type')}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Input type="number" step="0.01" label="Price per litre" error={errors.pricePerLitre?.message} {...register('pricePerLitre')} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Input type="number" step="0.1" label="Current quantity (L)" error={errors.currentQuantity?.message} {...register('currentQuantity')} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Input type="number" step="0.1" label="Minimum stock (L)" error={errors.minimumStock?.message} {...register('minimumStock')} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Input type="number" step="0.1" label="Maximum capacity (L)" error={errors.maximumCapacity?.message} {...register('maximumCapacity')} />
          </div>
          <div className="col-span-2">
            <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} {...register('status')} />
          </div>
        </form>
      </Modal>

      {/* Price change */}
      <Modal
        open={!!priceTarget}
        onClose={() => { setPriceTarget(null); setNewPrice(''); }}
        title={`Change price — ${priceTarget?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setPriceTarget(null); setNewPrice(''); }}>Cancel</Button>
            <Button
              onClick={() => {
                const price = Number(newPrice);
                if (!(price > 0)) return;
                changePrice.mutate(price);
                setNewPrice('');
              }}
              loading={changePrice.isPending}
              disabled={!(Number(newPrice) > 0)}
            >
              Save Price
            </Button>
          </>
        }
      >
        {priceTarget && (
          <div className="space-y-3">
            <p className="text-sm text-petrol-500 dark:text-petrol-400">
              Current price:{' '}
              <span className="font-bold text-petrol-900 dark:text-white">{formatCurrency(priceTarget.pricePerLitre)}</span> / L
            </p>
            <Input
              type="number"
              step="0.01"
              label="New price per litre"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              error={newPrice !== '' && !(Number(newPrice) > 0) ? 'Price must be greater than zero' : undefined}
              autoFocus
            />
            <p className="rounded-lg bg-petrol-50 dark:bg-petrol-800 px-3 py-2 text-xs text-petrol-500 dark:text-petrol-300">
              The change is recorded in the price history. Past sales keep the price used at the time of sale.
            </p>
          </div>
        )}
      </Modal>

      {/* Price history */}
      <Modal
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        title={`Price history — ${historyTarget?.name}`}
        size="md"
      >
        {priceHistoryQuery.isLoading ? (
          <div className="skeleton h-40 w-full" />
        ) : (
          <div className="space-y-2">
            {priceHistoryQuery.data && priceHistoryQuery.data.length > 0 ? (
              priceHistoryQuery.data.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-petrol-100 dark:border-petrol-800 px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-semibold">{formatCurrency(h.oldPrice)}</span>
                    <span className="mx-2 text-petrol-400">→</span>
                    <span className="font-semibold text-energy-600">{formatCurrency(h.newPrice)}</span>
                  </span>
                  <span className="text-xs text-petrol-400">
                    {h.changedByName ?? 'system'} · {formatDateTime(h.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-petrol-400">No price changes recorded yet.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Status toggle */}
      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.status === 'active' ? `Deactivate ${statusTarget?.name}?` : `Activate ${statusTarget?.name}?`}
        message={`Are you sure you want to ${statusTarget?.status === 'active' ? 'deactivate' : 'activate'} ${statusTarget?.name}? ${statusTarget?.status === 'active' ? 'It will no longer be sellable.' : ''}`}
        confirmLabel={statusTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        tone={statusTarget?.status === 'active' ? 'danger' : 'primary'}
        loading={toggleStatus.isPending}
        onConfirm={() => toggleStatus.mutate()}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}


