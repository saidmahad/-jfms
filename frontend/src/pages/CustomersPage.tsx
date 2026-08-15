import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Users as UsersIcon, Eye, IdCard } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card, CardHeader } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx';
import { SearchInput } from '../components/ui/SearchInput.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatCurrency, formatDateTime, formatLitres } from '../lib/format.ts';
import type { Customer, Sale } from '../types/index.ts';

interface CustomerForm {
  fullName: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  rfidId: string;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>({ fullName: '', phone: '', vehicleNumber: '', vehicleType: '', rfidId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const customersQuery = useQuery({
    queryKey: ['customers', { search, vehicleType }],
    queryFn: async () => {
      const res = await api.get<{ data: Customer[] }>('/customers', { params: { search, vehicleType } });
      return res.data.data;
    },
  });

  const historyQuery = useQuery({
    queryKey: ['customers', 'history', viewing?.id],
    queryFn: async () => {
      const res = await api.get<{ data: { customer: Customer; history: Sale[] } }>(`/customers/${viewing!.id}`);
      return res.data.data;
    },
    enabled: !!viewing,
  });

  const saveCustomer = useMutation({
    mutationFn: async (values: CustomerForm) => {
      if (editing) {
        const res = await api.put<{ data: Customer }>(`/customers/${editing.id}`, values);
        return res.data.data;
      }
      const res = await api.post<{ data: Customer }>('/customers', values);
      return res.data.data;
    },
    onSuccess: () => {
      toast(editing ? 'Customer updated' : 'Customer created', 'success');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const deleteCustomer = useMutation({
    mutationFn: async () => {
      await api.delete(`/customers/${deleteTarget!.id}`);
    },
    onSuccess: () => {
      toast('Customer deleted', 'success');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ fullName: '', phone: '', vehicleNumber: '', vehicleType: 'Car', rfidId: '' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ fullName: c.fullName, phone: c.phone ?? '', vehicleNumber: c.vehicleNumber ?? '', vehicleType: c.vehicleType ?? '', rfidId: c.rfidId ?? '' });
    setErrors({});
    setModalOpen(true);
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Customer name is required';
    if (form.phone && !/^[+()\d\s-]{7,}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    setErrors(e);
    if (Object.keys(e).length === 0) saveCustomer.mutate(form);
  };

  const data = customersQuery.data;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Vehicle and loyalty customers of the station"
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Customer</Button>}
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, vehicle, RFID…" />
          <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="All vehicle types" options={[
            { value: 'Car', label: 'Car' },
            { value: 'Truck', label: 'Truck' },
            { value: 'Van', label: 'Van' },
            { value: 'Motorcycle', label: 'Motorcycle' },
            { value: 'Other', label: 'Other' },
          ]} />
        </div>
      </Card>

      {customersQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : customersQuery.isError ? (
        <ErrorState message={errorMessage(customersQuery.error)} onRetry={() => customersQuery.refetch()} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState icon={<UsersIcon className="h-7 w-7" />} title="No customers found" description="Add customers to track purchases and loyalty IDs." action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Customer</Button>} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">Customer</th>
                  <th className="table-head px-4 py-3 text-left">Phone</th>
                  <th className="table-head px-4 py-3 text-left">Vehicle</th>
                  <th className="table-head px-4 py-3 text-left">RFID / Loyalty</th>
                  <th className="table-head px-4 py-3 text-right">Purchases</th>
                  <th className="table-head px-4 py-3 text-right">Total Spent</th>
                  <th className="table-head px-4 py-3 text-left">Last Transaction</th>
                  <th className="table-head px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                    <td className="table-cell px-5 font-semibold text-petrol-900 dark:text-white">{c.fullName}</td>
                    <td className="table-cell text-petrol-600 dark:text-slate-300">{c.phone ?? '—'}</td>
                    <td className="table-cell">
                      <p>{c.vehicleNumber ?? '—'}</p>
                      <p className="text-xs text-petrol-400">{c.vehicleType ?? ''}</p>
                    </td>
                    <td className="table-cell">{c.rfidId ? <Badge tone="blue"><IdCard className="h-3 w-3" /> {c.rfidId}</Badge> : '—'}</td>
                    <td className="table-cell text-right">{c.totalPurchases ?? 0}</td>
                    <td className="table-cell text-right font-semibold">{formatCurrency(c.totalSpent ?? 0)}</td>
                    <td className="table-cell text-petrol-500 dark:text-petrol-400">{c.lastTransaction ? formatDateTime(c.lastTransaction) : '—'}</td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewing(c)} className="rounded-lg p-1.5 text-petrol-500 hover:bg-petrol-100 dark:hover:bg-petrol-800" aria-label="View customer"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-energy-600 hover:bg-energy-500/10" aria-label="Edit customer"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteTarget(c)} className="rounded-lg p-1.5 text-danger hover:bg-danger/10" aria-label="Delete customer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.fullName}` : 'Add Customer'} footer={
        <>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={saveCustomer.isPending}>{editing ? 'Save Changes' : 'Create Customer'}</Button>
        </>
      }>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} /></div>
          <div><Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} placeholder="+1-555-0000" /></div>
          <div><Input label="Vehicle number" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="JFK-1234" /></div>
          <div>
            <Select label="Vehicle type" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} options={[
              { value: 'Car', label: 'Car' }, { value: 'Truck', label: 'Truck' }, { value: 'Van', label: 'Van' },
              { value: 'Motorcycle', label: 'Motorcycle' }, { value: 'Other', label: 'Other' },
            ]} />
          </div>
          <div><Input label="RFID / Loyalty ID" value={form.rfidId} onChange={(e) => setForm({ ...form, rfidId: e.target.value })} placeholder="RFID-1001" /></div>
        </div>
      </Modal>

      {/* Profile / history */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.fullName} subtitle="Customer profile and transaction history" size="lg">
        {historyQuery.isLoading ? (
          <div className="skeleton h-48 w-full" />
        ) : historyQuery.data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="p-3"><p className="text-xs text-petrol-400">Phone</p><p className="text-sm font-semibold">{historyQuery.data.customer.phone ?? '—'}</p></Card>
              <Card className="p-3"><p className="text-xs text-petrol-400">Vehicle</p><p className="text-sm font-semibold">{historyQuery.data.customer.vehicleNumber ?? '—'}</p></Card>
              <Card className="p-3"><p className="text-xs text-petrol-400">Purchases</p><p className="text-sm font-semibold">{historyQuery.data.customer.totalPurchases ?? 0}</p></Card>
              <Card className="p-3"><p className="text-xs text-petrol-400">Total Spent</p><p className="text-sm font-semibold">{formatCurrency(historyQuery.data.customer.totalSpent ?? 0)}</p></Card>
            </div>
            {historyQuery.data.history.length === 0 ? (
              <EmptyState title="No transactions yet" description="This customer has not purchased fuel yet." />
            ) : (
              <Card>
                <CardHeader title="Transaction History" />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-petrol-100 dark:border-petrol-800">
                        <th className="table-head px-4 py-2.5 text-left">Sale</th>
                        <th className="table-head px-4 py-2.5 text-left">Fuel</th>
                        <th className="table-head px-4 py-2.5 text-right">Litres</th>
                        <th className="table-head px-4 py-2.5 text-right">Amount</th>
                        <th className="table-head px-4 py-2.5 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyQuery.data.history.map((s) => (
                        <tr key={s.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0">
                          <td className="px-4 py-2.5 text-sm font-semibold text-energy-600">#{s.id}</td>
                          <td className="px-4 py-2.5 text-sm">{s.fuelName}</td>
                          <td className="px-4 py-2.5 text-sm text-right">{formatLitres(s.litres)}</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{formatCurrency(s.totalAmount)}</td>
                          <td className="px-4 py-2.5 text-sm text-petrol-500 dark:text-petrol-400">{formatDateTime(s.saleDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete ${deleteTarget?.fullName}?`} message="Customers with recorded sales keep their history; the customer record itself will be removed." confirmLabel="Delete" loading={deleteCustomer.isPending} onConfirm={() => deleteCustomer.mutate()} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
