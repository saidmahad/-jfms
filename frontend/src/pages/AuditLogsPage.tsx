import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, FilterX } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { SearchInput } from '../components/ui/SearchInput.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { Pagination } from '../components/ui/Pagination.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatDateTime, titleCase } from '../lib/format.ts';
import type { AuditLog, Paginated } from '../types/index.ts';

const MODULES = ['auth', 'sales', 'fuels', 'pumps', 'inventory', 'suppliers', 'customers', 'employees', 'expenses', 'users', 'settings', 'profile'];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [viewing, setViewing] = useState<AuditLog | null>(null);

  const logsQuery = useQuery({
    queryKey: ['audit-logs', { page, search, module, from, to }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: 20 };
      if (search) params.search = search;
      if (module) params.module = module;
      if (from) params.from = `${from}T00:00:00.000Z`;
      if (to) params.to = `${to}T23:59:59.999Z`;
      const res = await api.get<{ data: Paginated<AuditLog> }>('/audit-logs', { params });
      return res.data.data;
    },
  });

  const data = logsQuery.data;
  const hasFilters = search || module || from || to;

  const clear = () => {
    setSearch(''); setModule(''); setFrom(''); setTo(''); setPage(1);
  };

  return (
    <div>
      <PageHeader title="Audit Logs" description="Every important action, recorded with user, IP and data changes" />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
          <div className="col-span-2">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search action, module, user…" />
          </div>
          <Select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} placeholder="All modules" options={MODULES.map((m) => ({ value: m, label: titleCase(m) }))} />
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} label="From" className="text-xs" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} label="To" className="text-xs" />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear} className="self-end">
              <FilterX className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </Card>

      {logsQuery.isLoading ? (
        <TableSkeleton rows={12} />
      ) : logsQuery.isError ? (
        <ErrorState message={errorMessage(logsQuery.error)} onRetry={() => logsQuery.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <EmptyState icon={<History className="h-7 w-7" />} title="No audit entries found" description="System activity will be recorded here as it happens." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">Action</th>
                  <th className="table-head px-4 py-3 text-left">Module</th>
                  <th className="table-head px-4 py-3 text-left">User</th>
                  <th className="table-head px-4 py-3 text-right">Record</th>
                  <th className="table-head px-4 py-3 text-left">IP Address</th>
                  <th className="table-head px-4 py-3 text-left">Timestamp</th>
                  <th className="table-head px-4 py-3 text-right">Changes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((log) => (
                  <tr key={log.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                    <td className="table-cell px-5">
                      <Badge tone={log.action.includes('delete') || log.action.includes('failed') || log.action.includes('blocked') ? 'red' : log.action.includes('create') ? 'green' : 'blue'}>
                        {titleCase(log.action)}
                      </Badge>
                    </td>
                    <td className="table-cell capitalize text-petrol-500 dark:text-petrol-400">{log.module}</td>
                    <td className="table-cell">{log.username ?? '—'}</td>
                    <td className="table-cell text-right">{log.recordId ?? '—'}</td>
                    <td className="table-cell text-petrol-500 dark:text-petrol-400">{log.ipAddress ?? '—'}</td>
                    <td className="table-cell text-petrol-500 dark:text-petrol-400">{formatDateTime(log.createdAt)}</td>
                    <td className="table-cell text-right">
                      <Button variant="outline" size="sm" onClick={() => setViewing(log)}>
                        {log.oldValues || log.newValues ? 'View' : '—'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
        </Card>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`${viewing ? titleCase(viewing.action) : ''} — #${viewing?.recordId ?? ''}`} subtitle={`${viewing?.username ?? 'system'} · ${viewing ? formatDateTime(viewing.createdAt) : ''} · ${viewing?.ipAddress ?? ''}`} size="lg">
        {viewing && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="label">Old values</p>
              <pre className="overflow-x-auto rounded-xl bg-petrol-50 dark:bg-petrol-950 p-4 text-xs text-petrol-700 dark:text-petrol-200">
                {viewing.oldValues ? JSON.stringify(viewing.oldValues, null, 2) : 'null'}
              </pre>
            </div>
            <div>
              <p className="label">New values</p>
              <pre className="overflow-x-auto rounded-xl bg-petrol-50 dark:bg-petrol-950 p-4 text-xs text-petrol-700 dark:text-petrol-200">
                {viewing.newValues ? JSON.stringify(viewing.newValues, null, 2) : 'null'}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
