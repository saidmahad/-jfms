import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ReceiptText, FilterX } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge, statusTone } from '../components/ui/Badge.tsx';
import { SearchInput } from '../components/ui/SearchInput.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Pagination } from '../components/ui/Pagination.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatCurrency, formatDateTime, formatLitres } from '../lib/format.ts';
import type { Paginated, Sale } from '../types/index.ts';

export default function SalesListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pumpId, setPumpId] = useState('');
  const [fuelId, setFuelId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const salesQuery = useQuery({
    queryKey: ['sales', { page, search, from, to, pumpId, fuelId, paymentMethod, employeeId }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: 15 };
      if (search) params.search = search;
      if (from) params.from = `${from}T00:00:00.000Z`;
      if (to) params.to = `${to}T23:59:59.999Z`;
      if (pumpId) params.pumpId = pumpId;
      if (fuelId) params.fuelId = fuelId;
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (employeeId) params.employeeId = employeeId;
      const res = await api.get<{ data: Paginated<Sale> }>('/sales', { params });
      return res.data.data;
    },
  });

  const pumpsQuery = useQuery({
    queryKey: ['pumps', { filter: true }],
    queryFn: async () => (await api.get<{ data: { id: number; pumpNumber: string }[] }>('/pumps')).data.data,
  });

  const fuelsQuery = useQuery({
    queryKey: ['fuels', { filter: true }],
    queryFn: async () => (await api.get<{ data: { items: { id: number; name: string }[] } }>('/fuels', { params: { perPage: 100 } })).data.data.items,
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', { filter: true }],
    queryFn: async () => (await api.get<{ data: { id: number; fullName: string }[] }>('/employees')).data.data,
    enabled: user?.role !== 'ATTENDANT',
  });

  const data = salesQuery.data;

  const clearFilters = () => {
    setSearch('');
    setFrom('');
    setTo('');
    setPumpId('');
    setFuelId('');
    setPaymentMethod('');
    setEmployeeId('');
    setPage(1);
  };

  const hasFilters = search || from || to || pumpId || fuelId || paymentMethod || employeeId;

  return (
    <div>
      <PageHeader
        title={user?.role === 'ATTENDANT' ? 'My Transactions' : 'Sales'}
        description="Browse, filter and open sale receipts"
        actions={
          <Button onClick={() => navigate('/sales/new')}>
            <Plus className="h-4 w-4" /> New Sale
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 lg:grid-cols-8">
          <div className="col-span-2">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search receipt, pump, fuel…" />
          </div>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} label="From" className="text-xs" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} label="To" className="text-xs" />
          <Select
            value={pumpId}
            onChange={(e) => { setPumpId(e.target.value); setPage(1); }}
            placeholder="All pumps"
            options={(pumpsQuery.data ?? []).map((p) => ({ value: p.id, label: p.pumpNumber }))}
            className="text-xs"
          />
          <Select
            value={fuelId}
            onChange={(e) => { setFuelId(e.target.value); setPage(1); }}
            placeholder="All fuels"
            options={(fuelsQuery.data ?? []).map((f) => ({ value: f.id, label: f.name }))}
            className="text-xs"
          />
          <Select
            value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
            placeholder="All payments"
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'mobile_money', label: 'Mobile Money' },
              { value: 'rfid', label: 'RFID' },
              { value: 'other', label: 'Other' },
            ]}
            className="text-xs"
          />
          {user?.role !== 'ATTENDANT' && (
            <Select
              value={employeeId}
              onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}
              placeholder="All attendants"
              options={(employeesQuery.data ?? []).map((e) => ({ value: e.id, label: e.fullName }))}
              className="text-xs"
            />
          )}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="self-end">
              <FilterX className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </Card>

      {salesQuery.isLoading ? (
        <TableSkeleton rows={10} />
      ) : salesQuery.isError ? (
        <ErrorState message={errorMessage(salesQuery.error)} onRetry={() => salesQuery.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ReceiptText className="h-7 w-7" />}
            title={hasFilters ? 'No matching sales' : 'No sales recorded'}
            description={hasFilters ? 'Try adjusting or clearing the filters.' : 'Sales will appear here once a transaction is completed.'}
            action={
              !hasFilters ? (
                <Button size="sm" onClick={() => navigate('/sales/new')}>
                  <Plus className="h-4 w-4" /> Record a sale
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">Sale</th>
                  <th className="table-head px-4 py-3 text-left">Pump</th>
                  <th className="table-head px-4 py-3 text-left">Fuel</th>
                  <th className="table-head px-4 py-3 text-right">Litres</th>
                  <th className="table-head px-4 py-3 text-right">Amount</th>
                  <th className="table-head px-4 py-3 text-left">Attendant</th>
                  <th className="table-head px-4 py-3 text-left">Customer</th>
                  <th className="table-head px-4 py-3 text-left">Payment</th>
                  <th className="table-head px-4 py-3 text-left">Date</th>
                  <th className="table-head px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s: Sale) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/sales/${s.id}`)}
                    className="cursor-pointer border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40"
                  >
                    <td className="table-cell px-5">
                      <span className="flex items-center gap-2 font-semibold text-energy-600">
                        <ReceiptText className="h-4 w-4" /> #{s.id}
                      </span>
                    </td>
                    <td className="table-cell text-petrol-600 dark:text-slate-300">{s.pumpNumber}</td>
                    <td className="table-cell">{s.fuelName}</td>
                    <td className="table-cell text-right">{formatLitres(s.litres)}</td>
                    <td className="table-cell text-right font-semibold text-petrol-900 dark:text-white">{formatCurrency(s.totalAmount)}</td>
                    <td className="table-cell">{s.employeeName ?? '—'}</td>
                    <td className="table-cell">{s.customerName ?? '—'}</td>
                    <td className="table-cell capitalize">{s.paymentMethod.replace('_', ' ')}</td>
                    <td className="table-cell text-petrol-500 dark:text-petrol-400">{formatDateTime(s.saleDate)}</td>
                    <td className="table-cell">
                      <Badge tone={statusTone(s.paymentStatus)}>{s.paymentStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
        </Card>
      )}
    </div>
  );
}
