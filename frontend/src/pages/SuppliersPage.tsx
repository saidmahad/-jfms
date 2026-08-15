import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
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
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatLitres } from '../lib/format.ts';
import type { Supplier } from '../types/index.ts';

interface SupplierForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>({ name: '', phone: '', email: '', address: '', status: 'active' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', { search, statusFilter }],
    queryFn: async () => {
      const res = await api.get<{ data: Supplier[] }>('/suppliers', { params: { search, status: statusFilter } });
      return res.data.data;
    },
  });

  const saveSupplier = useMutation({
    mutationFn: async (values: SupplierForm) => {
      if (editing) {
        const res = await api.put<{ data: Supplier }>(`/suppliers/${editing.id}`, values);
        return res.data.data;
      }
      const res = await api.post<{ data: Supplier }>('/suppliers', values);
      return res.data.data;
    },
    onSuccess: () => {
      toast(editing ? 'Supplier updated' : 'Supplier created', 'success');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const deleteSupplier = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/suppliers/${deleteTarget!.id}`);
      return res.data.message as string;
    },
    onSuccess: (message) => {
      toast(message, 'success');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const validate = (f: SupplierForm): boolean => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Supplier name is required';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Invalid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', phone: '', email: '', address: '', status: 'active' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', status: s.status });
    setErrors({});
    setModalOpen(true);
  };

  const data = suppliersQuery.data;

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Fuel suppliers and their delivery history"
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Supplier</Button>}
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, email…" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="All statuses" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
      </Card>

      {suppliersQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : suppliersQuery.isError ? (
        <ErrorState message={errorMessage(suppliersQuery.error)} onRetry={() => suppliersQuery.refetch()} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState icon={<Truck className="h-7 w-7" />} title="No suppliers found" description="Add suppliers to record stock deliveries." action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Supplier</Button>} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">Supplier</th>
                  <th className="table-head px-4 py-3 text-left">Contact</th>
                  <th className="table-head px-4 py-3 text-left">Address</th>
                  <th className="table-head px-4 py-3 text-right">Deliveries</th>
                  <th className="table-head px-4 py-3 text-right">Volume</th>
                  <th className="table-head px-4 py-3 text-left">Status</th>
                  <th className="table-head px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                    <td className="table-cell px-5 font-semibold text-petrol-900 dark:text-white">{s.name}</td>
                    <td className="table-cell">
                      <p className="text-petrol-600 dark:text-slate-300">{s.phone ?? '—'}</p>
                      <p className="text-xs text-petrol-400">{s.email ?? ''}</p>
                    </td>
                    <td className="table-cell max-w-[220px] truncate text-petrol-500 dark:text-petrol-400">{s.address ?? '—'}</td>
                    <td className="table-cell text-right">{s.purchases ?? 0}</td>
                    <td className="table-cell text-right">{formatLitres(s.totalQuantity ?? 0)}</td>
                    <td className="table-cell"><Badge tone={statusTone(s.status)}>{s.status}</Badge></td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-energy-600 hover:bg-energy-500/10" aria-label="Edit supplier"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteTarget(s)} className="rounded-lg p-1.5 text-danger hover:bg-danger/10" aria-label="Delete supplier"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add Supplier'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => validate(form) && saveSupplier.mutate(form)} loading={saveSupplier.isPending}>
              {editing ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Supplier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          </div>
          <div><Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} /></div>
          <div className="col-span-2"><Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="col-span-2">
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name}?`}
        message="Suppliers with purchase history are deactivated instead of deleted. Are you sure?"
        confirmLabel="Delete"
        loading={deleteSupplier.isPending}
        onConfirm={() => deleteSupplier.mutate()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
