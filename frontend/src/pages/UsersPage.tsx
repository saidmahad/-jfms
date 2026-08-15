import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power, PowerOff, ShieldCheck, KeyRound } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge, statusTone } from '../components/ui/Badge.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatDateTime } from '../lib/format.ts';
import { cn } from '../lib/utils.ts';
import type { Employee, User } from '../types/index.ts';

const ROLES = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ATTENDANT', label: 'Fuel Attendant' },
];

interface UserForm {
  username: string;
  email: string;
  password: string;
  role: string;
  status: string;
  employeeId: string;
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>({ username: '', email: '', password: '', role: 'ATTENDANT', status: 'active', employeeId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<{ data: User[] }>('/users')).data.data,
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', { users: true }],
    queryFn: async () => (await api.get<{ data: Employee[] }>('/employees')).data.data,
  });

  const saveUser = useMutation({
    mutationFn: async (values: UserForm) => {
      const payload = {
        username: values.username,
        email: values.email,
        ...(values.password ? { password: values.password } : {}),
        role: values.role,
        status: values.status,
        employeeId: values.employeeId ? Number(values.employeeId) : null,
      };
      if (editing) {
        const res = await api.put<{ data: User }>(`/users/${editing.id}`, payload);
        return res.data.data;
      }
      const res = await api.post<{ data: User }>('/users', payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast(editing ? 'User updated' : 'User created', 'success');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const next = statusTarget!.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/users/${statusTarget!.id}/status`, { status: next });
    },
    onSuccess: () => {
      toast(`${statusTarget?.username} ${statusTarget?.status === 'active' ? 'deactivated' : 'activated'}`, 'success');
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (form.username.trim().length < 3) e.username = 'Username must be at least 3 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (!editing && form.password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    if (Object.keys(e).length === 0) saveUser.mutate(form);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', email: '', password: '', role: 'ATTENDANT', status: 'active', employeeId: '' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, password: '', role: u.role, status: u.status, employeeId: u.employeeId ? String(u.employeeId) : '' });
    setErrors({});
    setModalOpen(true);
  };

  const data = usersQuery.data;

  return (
    <div>
      <PageHeader title="Users" description="System accounts and role assignment" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add User</Button>} />

      {usersQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : usersQuery.isError ? (
        <ErrorState message={errorMessage(usersQuery.error)} onRetry={() => usersQuery.refetch()} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title="No users found" description="Create system accounts and assign roles." action={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add User</Button>} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">User</th>
                  <th className="table-head px-4 py-3 text-left">Role</th>
                  <th className="table-head px-4 py-3 text-left">Employee</th>
                  <th className="table-head px-4 py-3 text-left">Status</th>
                  <th className="table-head px-4 py-3 text-left">Last Login</th>
                  <th className="table-head px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                    <td className="table-cell px-5">
                      <p className="flex items-center gap-2 font-semibold text-petrol-900 dark:text-white">
                        {u.username}
                        {u.id === me?.id && <span className="rounded-full bg-energy-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-energy-600">You</span>}
                      </p>
                      <p className="text-xs text-petrol-400">{u.email}</p>
                    </td>
                    <td className="table-cell"><Badge tone={u.role === 'ADMIN' ? 'purple' : u.role === 'MANAGER' ? 'blue' : 'slate'}>{u.role}</Badge></td>
                    <td className="table-cell">{u.employeeName ?? '—'}</td>
                    <td className="table-cell"><Badge tone={statusTone(u.status)}>{u.status}</Badge></td>
                    <td className="table-cell text-petrol-500 dark:text-petrol-400">{u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}</td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-energy-600 hover:bg-energy-500/10" aria-label="Edit user"><Pencil className="h-4 w-4" /></button>
                        {u.id !== me?.id && (
                          <button onClick={() => setStatusTarget(u)} className={cn('rounded-lg p-1.5 hover:bg-petrol-100 dark:hover:bg-petrol-800', u.status === 'active' ? 'text-danger' : 'text-success')} aria-label={u.status === 'active' ? 'Deactivate user' : 'Activate user'}>
                            {u.status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.username}` : 'Add User'} footer={
        <>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={saveUser.isPending}>{editing ? 'Save Changes' : 'Create User'}</Button>
        </>
      }>
        <div className="grid grid-cols-2 gap-4">
          <div><Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} error={errors.username} /></div>
          <div><Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} /></div>
          <div>
            <Input label={editing ? 'New password (leave blank to keep)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} icon={<KeyRound className="h-4 w-4" />} />
          </div>
          <div>
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLES} />
          </div>
          <div>
            <Select label="Linked employee" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="None" options={(employeesQuery.data ?? []).map((emp) => ({ value: emp.id, label: emp.fullName }))} />
          </div>
          <div>
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </div>
          <p className="col-span-2 text-xs text-petrol-400">Role changes take effect immediately and change the user's permissions across the system.</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.status === 'active' ? `Deactivate ${statusTarget?.username}?` : `Activate ${statusTarget?.username}?`}
        message={statusTarget?.status === 'active' ? 'This user will no longer be able to log in.' : 'This user will regain access to the system.'}
        confirmLabel={statusTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        tone={statusTarget?.status === 'active' ? 'danger' : 'primary'}
        loading={toggleStatus.isPending}
        onConfirm={() => toggleStatus.mutate()}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
