import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power, PowerOff, Users as UsersIcon } from 'lucide-react';
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
import { formatCurrency, formatDate, formatLitres } from '../lib/format.ts';
import { cn } from '../lib/utils.ts';
import type { Employee } from '../types/index.ts';

const POSITIONS = ['Administrator', 'Manager', 'Fuel Attendant', 'Accountant', 'Supervisor'];

interface EmployeeForm {
  fullName: string;
  phone: string;
  position: string;
  salary: number;
  status: 'active' | 'inactive';
  hireDate: string;
}

export default function EmployeesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [statusTarget, setStatusTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>({ fullName: '', phone: '', position: 'Fuel Attendant', salary: 0, status: 'active', hireDate: new Date().toISOString().slice(0, 10) });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const employeesQuery = useQuery({
    queryKey: ['employees', { search, statusFilter, positionFilter }],
    queryFn: async () => {
      const res = await api.get<{ data: Employee[] }>('/employees', { params: { search, status: statusFilter, position: positionFilter } });
      return res.data.data;
    },
  });

  const saveEmployee = useMutation({
    mutationFn: async (values: EmployeeForm) => {
      if (editing) {
        const res = await api.put<{ data: Employee }>(`/employees/${editing.id}`, values);
        return res.data.data;
      }
      const res = await api.post<{ data: Employee }>('/employees', values);
      return res.data.data;
    },
    onSuccess: () => {
      toast(editing ? 'Employee updated' : 'Employee created', 'success');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const next = statusTarget!.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/employees/${statusTarget!.id}/status`, { status: next });
    },
    onSuccess: () => {
      toast(`${statusTarget?.fullName} ${statusTarget?.status === 'active' ? 'deactivated' : 'activated'}`, 'success');
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Employee name is required';
    if (form.salary < 0) e.salary = 'Salary cannot be negative';
    if (!form.hireDate) e.hireDate = 'Hire date is required';
    setErrors(e);
    if (Object.keys(e).length === 0) saveEmployee.mutate(form);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ fullName: '', phone: '', position: 'Fuel Attendant', salary: 0, status: 'active', hireDate: new Date().toISOString().slice(0, 10) });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({ fullName: emp.fullName, phone: emp.phone ?? '', position: emp.position, salary: emp.salary, status: emp.status, hireDate: emp.hireDate.slice(0, 10) });
    setErrors({});
    setModalOpen(true);
  };

  const data = employeesQuery.data;

  return (
    <div>
      <PageHeader title="Employees" description="Staff, positions, salaries and performance" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Employee</Button>} />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, position…" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="All statuses" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <Select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} placeholder="All positions" options={POSITIONS.map((p) => ({ value: p, label: p }))} />
        </div>
      </Card>

      {employeesQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : employeesQuery.isError ? (
        <ErrorState message={errorMessage(employeesQuery.error)} onRetry={() => employeesQuery.refetch()} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState icon={<UsersIcon className="h-7 w-7" />} title="No employees found" description="Add employees to manage staffing and track sales performance." action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Employee</Button>} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">Employee</th>
                  <th className="table-head px-4 py-3 text-left">Position</th>
                  <th className="table-head px-4 py-3 text-right">Salary</th>
                  <th className="table-head px-4 py-3 text-right">Sales</th>
                  <th className="table-head px-4 py-3 text-right">Litres</th>
                  <th className="table-head px-4 py-3 text-right">Revenue</th>
                  <th className="table-head px-4 py-3 text-left">Hire Date</th>
                  <th className="table-head px-4 py-3 text-left">Status</th>
                  <th className="table-head px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((emp) => (
                  <tr key={emp.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                    <td className="table-cell px-5">
                      <p className="font-semibold text-petrol-900 dark:text-white">{emp.fullName}</p>
                      <p className="text-xs text-petrol-400">{emp.phone ?? '—'}</p>
                    </td>
                    <td className="table-cell"><Badge tone="blue">{emp.position}</Badge></td>
                    <td className="table-cell text-right">{formatCurrency(emp.salary)}</td>
                    <td className="table-cell text-right">{emp.totalSales ?? 0}</td>
                    <td className="table-cell text-right">{formatLitres(emp.totalLitres ?? 0)}</td>
                    <td className="table-cell text-right font-semibold">{formatCurrency(emp.totalRevenue ?? 0)}</td>
                    <td className="table-cell text-petrol-500 dark:text-petrol-400">{formatDate(emp.hireDate)}</td>
                    <td className="table-cell"><Badge tone={statusTone(emp.status)}>{emp.status}</Badge></td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(emp)} className="rounded-lg p-1.5 text-energy-600 hover:bg-energy-500/10" aria-label="Edit employee"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setStatusTarget(emp)} className={cn('rounded-lg p-1.5 hover:bg-petrol-100 dark:hover:bg-petrol-800', emp.status === 'active' ? 'text-danger' : 'text-success')} aria-label={emp.status === 'active' ? 'Deactivate' : 'Activate'}>
                          {emp.status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.fullName}` : 'Add Employee'} footer={
        <>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={saveEmployee.isPending}>{editing ? 'Save Changes' : 'Create Employee'}</Button>
        </>
      }>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} /></div>
          <div><Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <Select label="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} options={POSITIONS.map((p) => ({ value: p, label: p }))} />
          </div>
          <div><Input type="number" step="0.01" label="Salary" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} error={errors.salary} /></div>
          <div><Input type="date" label="Hire date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} error={errors.hireDate} /></div>
          <div className="col-span-2">
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </div>
          <p className="col-span-2 text-xs text-petrol-400">System permissions are based on the linked user account role, not the employee position.</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.status === 'active' ? `Deactivate ${statusTarget?.fullName}?` : `Activate ${statusTarget?.fullName}?`}
        message={statusTarget?.status === 'active' ? 'Inactive employees cannot make transactions.' : 'This employee will be able to make transactions again.'}
        confirmLabel={statusTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        tone={statusTarget?.status === 'active' ? 'danger' : 'primary'}
        loading={toggleStatus.isPending}
        onConfirm={() => toggleStatus.mutate()}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
