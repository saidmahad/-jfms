import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { KeyRound, ShieldCheck, User as UserIcon } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Badge, statusTone } from '../components/ui/Badge.tsx';
import { PageLoader } from '../components/ui/Spinner.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatDate, formatDateTime } from '../lib/format.ts';
import type { AuthUser } from '../types/index.ts';

interface ProfileData extends AuthUser {
  phone: string | null;
  position: string | null;
  salary: number | null;
  hireDate: string | null;
  lastLogin: string | null;
  createdAt: string;
  permissions: string[];
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get<{ data: ProfileData }>('/profile')).data.data,
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const res = await api.put('/profile/password', { currentPassword, newPassword });
      return res.data;
    },
    onSuccess: () => {
      toast('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    },
    onError: (err) => {
      setError(errorMessage(err, 'Password change failed'));
    },
  });

  if (profileQuery.isLoading) return <PageLoader />;
  if (profileQuery.isError || !profileQuery.data) {
    return <ErrorState message={errorMessage(profileQuery.error)} onRetry={() => profileQuery.refetch()} />;
  }

  const p = profileQuery.data;

  const submitPassword = () => {
    setError(null);
    if (newPassword.length < 8) return setError('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    changePassword.mutate();
  };

  return (
    <div>
      <PageHeader title="My Profile" description="Your account and security" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account Information" />
          <CardBody>
            <div className="mb-5 flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-petroleum-gradient font-display text-2xl font-extrabold text-white">
                {p.username.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-display text-lg font-bold text-petrol-900 dark:text-white">{p.employeeName ?? p.username}</p>
                <p className="text-sm capitalize text-petrol-400">{p.role.toLowerCase()}{p.position ? ` · ${p.position}` : ''}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div><dt className="label">Username</dt><dd className="font-semibold">{p.username}</dd></div>
              <div><dt className="label">Email</dt><dd className="font-semibold">{p.email}</dd></div>
              <div><dt className="label">Phone</dt><dd className="font-semibold">{p.phone ?? '—'}</dd></div>
              <div><dt className="label">Status</dt><dd><Badge tone={statusTone(p.status)}>{p.status}</Badge></dd></div>
              <div><dt className="label">Hire date</dt><dd className="font-semibold">{p.hireDate ? formatDate(p.hireDate) : '—'}</dd></div>
              <div><dt className="label">Last login</dt><dd className="font-semibold">{p.lastLogin ? formatDateTime(p.lastLogin) : 'Never'}</dd></div>
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Change Password" subtitle="Update your account password" />
            <CardBody className="space-y-4">
              {error && <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
              <Input type="password" label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} icon={<KeyRound className="h-4 w-4" />} />
              <Input type="password" label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Input type="password" label="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <Button onClick={submitPassword} loading={changePassword.isPending} disabled={!currentPassword || !newPassword}>
                <KeyRound className="h-4 w-4" /> Update Password
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="My Permissions" subtitle={`Access granted to the ${p.role} role`} />
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {p.permissions.map((perm) => (
                  <span key={perm} className="flex items-center gap-1.5 rounded-full border border-petrol-200 dark:border-petrol-700 bg-petrol-50 dark:bg-petrol-800 px-3 py-1 text-xs font-medium text-petrol-700 dark:text-petrol-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-energy-500" />
                    {perm}
                  </span>
                ))}
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-petrol-400">
                <UserIcon className="h-3.5 w-3.5" />
                Permissions are enforced by the server on every request.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
