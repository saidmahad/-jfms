import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, FilterX } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge, statusTone } from '../components/ui/Badge.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Pagination } from '../components/ui/Pagination.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatDateTime, formatLitres } from '../lib/format.ts';
import { cn } from '../lib/utils.ts';
import type { InventoryTransaction, Paginated } from '../types/index.ts';

export default function InventoryMovementsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [fuelId, setFuelId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const movementsQuery = useQuery({
    queryKey: ['inventory-movements', { page, type, fuelId, from, to }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: 15 };
      if (type) params.type = type;
      if (fuelId) params.fuelId = fuelId;
      if (from) params.from = `${from}T00:00:00.000Z`;
      if (to) params.to = `${to}T23:59:59.999Z`;
      const res = await api.get<{ data: Paginated<InventoryTransaction> }>('/inventory/movements', { params });
      return res.data.data;
    },
  });

  const fuelsQuery = useQuery({
    queryKey: ['fuels', { movements: true }],
    queryFn: async () => (await api.get<{ data: { items: { id: number; name: string }[] } }>('/fuels', { params: { perPage: 100 } })).data.data.items,
  });

  const data = movementsQuery.data;
  const hasFilters = type || fuelId || from || to;

  const clear = () => {
    setType(''); setFuelId(''); setFrom(''); setTo(''); setPage(1);
  };

  return (
    <div>
      <PageHeader title="Stock Movements" description="Every purchase, sale, and adjustment — fully traceable" />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-2">
            <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} placeholder="All types" options={[
              { value: 'purchase', label: 'Purchase' },
              { value: 'sale', label: 'Sale' },
              { value: 'adjustment', label: 'Adjustment' },
              { value: 'return', label: 'Return' },
            ]} />
          </div>
          <div className="col-span-2">
            <Select value={fuelId} onChange={(e) => { setFuelId(e.target.value); setPage(1); }} placeholder="All fuels" options={(fuelsQuery.data ?? []).map((f) => ({ value: f.id, label: f.name }))} />
          </div>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} label="From" className="text-xs" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} label="To" className="text-xs" />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear} className="self-end">
              <FilterX className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </Card>

      {movementsQuery.isLoading ? (
        <TableSkeleton rows={12} />
      ) : movementsQuery.isError ? (
        <ErrorState message={errorMessage(movementsQuery.error)} onRetry={() => movementsQuery.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ArrowLeftRight className="h-7 w-7" />}
            title={hasFilters ? 'No matching movements' : 'No stock movements yet'}
            description={hasFilters ? 'Try adjusting the filters.' : 'Purchases and sales will create traceable movements here.'}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">Type</th>
                  <th className="table-head px-4 py-3 text-left">Fuel</th>
                  <th className="table-head px-4 py-3 text-right">Quantity</th>
                  <th className="table-head px-4 py-3 text-left">Supplier</th>
                  <th className="table-head px-4 py-3 text-left">Reference</th>
                  <th className="table-head px-4 py-3 text-left">Notes</th>
                  <th className="table-head px-4 py-3 text-left">By</th>
                  <th className="table-head px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                    <td className="table-cell px-5"><Badge tone={statusTone(m.type)}>{m.type}</Badge></td>
                    <td className="table-cell font-semibold text-petrol-900 dark:text-white">{m.fuelName}</td>
                    <td className={cn('table-cell text-right font-bold', m.quantity > 0 ? 'text-success' : 'text-danger')}>
                      {m.quantity > 0 ? '+' : ''}{formatLitres(m.quantity)}
                    </td>
                    <td className="table-cell">{m.supplierName ?? '—'}</td>
                    <td className="table-cell text-petrol-500 dark:text-petrol-400">{m.reference ?? '—'}</td>
                    <td className="table-cell max-w-[200px] truncate text-petrol-500 dark:text-petrol-400">{m.notes ?? '—'}</td>
                    <td className="table-cell">{m.createdByName ?? '—'}</td>
                    <td className="table-cell text-petrol-500 dark:text-petrol-400">{formatDateTime(m.createdAt)}</td>
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
