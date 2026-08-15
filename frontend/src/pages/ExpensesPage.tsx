import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Textarea } from '../components/ui/Textarea.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx';
import { SearchInput } from '../components/ui/SearchInput.tsx';
import { Pagination } from '../components/ui/Pagination.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatCurrency, formatDate, titleCase } from '../lib/format.ts';
import type { Employee, Expense, Paginated } from '../types/index.ts';

const CATEGORIES = ['electricity', 'salaries', 'maintenance', 'transport', 'supplies', 'rent', 'other'];
const PAYMENT_METHODS = ['cash', 'card', 'mobile_money', 'rfid', 'other'];

interface ExpenseForm {
  employeeId: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  expenseDate: string;
  notes: string;
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>({ employeeId: '', category: 'other', description: '', amount: 0, paymentMethod: 'cash', expenseDate: new Date().toISOString().slice(0, 10), notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const expensesQuery = useQuery({
    queryKey: ['expenses', { page, search, category, from, to }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: 15 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (from) params.from = `${from}T00:00:00.000Z`;
      if (to) params.to = `${to}T23:59:59.999Z`;
      const res = await api.get<{ data: Paginated<Expense> & { summary: { totalAmount: number } } }>('/expenses', { params });
      return res.data.data;
    },
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', { expenseForm: true }],
    queryFn: async () => (await api.get<{ data: Employee[] }>('/employees')).data.data,
  });

  const saveExpense = useMutation({
    mutationFn: async (values: ExpenseForm) => {
      const payload = {
        employeeId: values.employeeId ? Number(values.employeeId) : null,
        category: values.category,
        description: values.description,
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
        expenseDate: `${values.expenseDate}T12:00:00.000Z`,
        notes: values.notes || null,
      };
      if (editing) {
        const res = await api.put<{ data: Expense }>(`/expenses/${editing.id}`, payload);
        return res.data.data;
      }
      const res = await api.post<{ data: Expense }>('/expenses', payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast(editing ? 'Expense updated' : 'Expense recorded', 'success');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const deleteExpense = useMutation({
    mutationFn: async () => {
      await api.delete(`/expenses/${deleteTarget!.id}`);
    },
    onSuccess: () => {
      toast('Expense deleted', 'success');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = 'Description is required';
    if (!(form.amount > 0)) e.amount = 'Amount must be greater than zero';
    if (!form.expenseDate) e.expenseDate = 'Expense date is required';
    setErrors(e);
    if (Object.keys(e).length === 0) saveExpense.mutate(form);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ employeeId: '', category: 'other', description: '', amount: 0, paymentMethod: 'cash', expenseDate: new Date().toISOString().slice(0, 10), notes: '' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      employeeId: exp.employeeId ? String(exp.employeeId) : '',
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      expenseDate: exp.expenseDate.slice(0, 10),
      notes: exp.notes ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const data = expensesQuery.data;

  return (
    <div>
      <PageHeader title="Expenses" description="Station operating expenses and payments" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Expense</Button>} />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
          <div className="col-span-2">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search description, category…" />
          </div>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="All categories" options={CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))} />
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} label="From" className="text-xs" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} label="To" className="text-xs" />
        </div>
      </Card>

      {expensesQuery.isLoading ? (
        <TableSkeleton rows={10} />
      ) : expensesQuery.isError ? (
        <ErrorState message={errorMessage(expensesQuery.error)} onRetry={() => expensesQuery.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <EmptyState icon={<Wallet className="h-7 w-7" />} title="No expenses recorded" description="Record operating costs to keep revenue and profit reports accurate." action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Expense</Button>} />
        </Card>
      ) : (
        <>
          <Card className="mb-4 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-petrol-400">Total for current filters</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-danger">{formatCurrency(data.summary.totalAmount)}</p>
          </Card>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px]">
                <thead>
                  <tr className="border-b border-petrol-100 dark:border-petrol-800">
                    <th className="table-head px-5 py-3 text-left">Category</th>
                    <th className="table-head px-4 py-3 text-left">Description</th>
                    <th className="table-head px-4 py-3 text-right">Amount</th>
                    <th className="table-head px-4 py-3 text-left">Recorded by</th>
                    <th className="table-head px-4 py-3 text-left">Payment</th>
                    <th className="table-head px-4 py-3 text-left">Date</th>
                    <th className="table-head px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((exp) => (
                    <tr key={exp.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                      <td className="table-cell px-5"><span className="rounded-full bg-petrol-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-petrol-700 dark:bg-petrol-800 dark:text-petrol-200">{titleCase(exp.category)}</span></td>
                      <td className="table-cell max-w-[260px]">
                        <p className="truncate font-medium text-petrol-800 dark:text-slate-100">{exp.description}</p>
                        {exp.notes && <p className="truncate text-xs text-petrol-400">{exp.notes}</p>}
                      </td>
                      <td className="table-cell text-right font-bold text-danger">{formatCurrency(exp.amount)}</td>
                      <td className="table-cell">{exp.employeeName ?? '—'}</td>
                      <td className="table-cell capitalize text-petrol-500 dark:text-petrol-400">{exp.paymentMethod.replace('_', ' ')}</td>
                      <td className="table-cell text-petrol-500 dark:text-petrol-400">{formatDate(exp.expenseDate)}</td>
                      <td className="table-cell">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(exp)} className="rounded-lg p-1.5 text-energy-600 hover:bg-energy-500/10" aria-label="Edit expense"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteTarget(exp)} className="rounded-lg p-1.5 text-danger hover:bg-danger/10" aria-label="Delete expense"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
          </Card>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'} footer={
        <>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={saveExpense.isPending}>{editing ? 'Save Changes' : 'Record Expense'}</Button>
        </>
      }>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))} />
          </div>
          <div>
            <Input type="number" step="0.01" label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} error={errors.amount} />
          </div>
          <div className="col-span-2">
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} />
          </div>
          {user?.role !== 'ATTENDANT' && (
            <div>
              <Select label="Recorded by (employee)" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="Unassigned" options={(employeesQuery.data ?? []).map((emp) => ({ value: emp.id, label: emp.fullName }))} />
            </div>
          )}
          <div>
            <Select label="Payment method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} options={PAYMENT_METHODS.map((m) => ({ value: m, label: titleCase(m) }))} />
          </div>
          <div>
            <Input type="date" label="Expense date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} error={errors.expenseDate} />
          </div>
          <div className="col-span-2">
            <Textarea label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete expense?" message={`This will permanently remove the ${formatCurrency(deleteTarget?.amount ?? 0)} expense.`} confirmLabel="Delete" loading={deleteExpense.isPending} onConfirm={() => deleteExpense.mutate()} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
