import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Truck, SlidersHorizontal, Droplets, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge, statusTone } from '../components/ui/Badge.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { formatLitres } from '../lib/format.ts';
import { cn } from '../lib/utils.ts';
import type { Fuel, Supplier } from '../types/index.ts';

interface InventoryItem extends Fuel {
  totalPurchased: number;
  totalSold: number;
}

export default function InventoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get<{ data: { summary: { fuelCount: number; totalLitres: number; lowStockCount: number }; items: InventoryItem[] } }>('/inventory');
      return res.data.data;
    },
  });

  const fuelsQuery = useQuery({
    queryKey: ['fuels', { inv: true }],
    queryFn: async () => (await api.get<{ data: { items: Fuel[] } }>('/fuels', { params: { perPage: 100 } })).data.data.items,
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', { inv: true }],
    queryFn: async () => (await api.get<{ data: Supplier[] }>('/suppliers')).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['fuels'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const purchase = useMutation({
    mutationFn: async (values: { fuelId: number; supplierId?: number | null; quantity: number; reference?: string; notes?: string }) => {
      const res = await api.post('/inventory/purchase', values);
      return res.data;
    },
    onSuccess: () => {
      toast('Stock purchase recorded and inventory updated', 'success');
      setPurchaseOpen(false);
      invalidate();
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const adjust = useMutation({
    mutationFn: async (values: { fuelId: number; quantity: number; reason: string }) => {
      const res = await api.post('/inventory/adjustment', values);
      return res.data;
    },
    onSuccess: () => {
      toast('Stock adjustment completed', 'success');
      setAdjustOpen(false);
      invalidate();
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  const data = inventoryQuery.data;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Live fuel stock, purchases and adjustments"
        actions={
          <>
            <Button variant="outline" onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust Stock
            </Button>
            <Button onClick={() => setPurchaseOpen(true)}>
              <Truck className="h-4 w-4" /> Purchase Stock
            </Button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-petrol-400">Fuel Types</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-petrol-900 dark:text-white">{data?.summary.fuelCount ?? '—'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-petrol-400">Total Stock</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-petrol-900 dark:text-white">{data ? formatLitres(data.summary.totalLitres) : '—'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-petrol-400">Low Stock Alerts</p>
          <p className={cn('mt-1 font-display text-2xl font-extrabold', (data?.summary.lowStockCount ?? 0) > 0 ? 'text-amber-500' : 'text-success')}>
            {data?.summary.lowStockCount ?? '—'}
          </p>
        </Card>
      </div>

      {inventoryQuery.isLoading ? (
        <TableSkeleton rows={5} />
      ) : inventoryQuery.isError ? (
        <ErrorState message={errorMessage(inventoryQuery.error)} onRetry={() => inventoryQuery.refetch()} />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Droplets className="h-7 w-7" />}
            title="No inventory yet"
            description="Add fuels, then record purchases to build up stock."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">Fuel</th>
                  <th className="table-head px-4 py-3 text-right">Current Stock</th>
                  <th className="table-head px-4 py-3 text-right">Minimum</th>
                  <th className="table-head px-4 py-3 text-right">Purchased</th>
                  <th className="table-head px-4 py-3 text-right">Sold</th>
                  <th className="table-head px-4 py-3 text-left">Level</th>
                  <th className="table-head px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((f) => {
                  const pct = f.maximumCapacity > 0 ? Math.min(100, (f.currentQuantity / f.maximumCapacity) * 100) : 0;
                  return (
                    <tr key={f.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                      <td className="table-cell px-5 font-semibold text-petrol-900 dark:text-white">{f.name}</td>
                      <td className="table-cell text-right font-bold">{formatLitres(f.currentQuantity)}</td>
                      <td className="table-cell text-right text-petrol-500 dark:text-petrol-400">{formatLitres(f.minimumStock)}</td>
                      <td className="table-cell text-right text-success">{formatLitres(f.totalPurchased)}</td>
                      <td className="table-cell text-right text-petrol-500 dark:text-petrol-300">{formatLitres(f.totalSold)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-petrol-100 dark:bg-petrol-800">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                f.stockLevel?.status === 'critical' ? 'bg-danger' : f.stockLevel?.status === 'low' ? 'bg-fuel-400' : 'bg-energy-gradient',
                              )}
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <span className="text-xs text-petrol-400">{Math.round(pct)}%</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <Badge tone={statusTone(f.stockLevel?.status ?? 'ok')}>{f.stockLevel?.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Purchase modal */}
      <PurchaseModal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        fuels={fuelsQuery.data ?? []}
        suppliers={suppliersQuery.data ?? []}
        onSave={(values) => purchase.mutate(values)}
        loading={purchase.isPending}
      />

      {/* Adjustment modal */}
      <AdjustmentModal open={adjustOpen} onClose={() => setAdjustOpen(false)} fuels={fuelsQuery.data ?? []} onSave={(values) => adjust.mutate(values)} loading={adjust.isPending} />
    </div>
  );
}

function PurchaseModal({
  open,
  onClose,
  fuels,
  suppliers,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  fuels: Fuel[];
  suppliers: Supplier[];
  onSave: (v: { fuelId: number; supplierId?: number | null; quantity: number; reference?: string; notes?: string }) => void;
  loading: boolean;
}) {
  const [fuelId, setFuelId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('1000');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFuelId(''); setSupplierId(''); setQuantity('1000'); setReference(''); setNotes(''); setError(null);
  };

  const submit = () => {
    const qty = Number(quantity);
    if (!fuelId) return setError('Select a fuel');
    if (!(qty > 0)) return setError('Quantity must be greater than zero');
    onSave({ fuelId: Number(fuelId), supplierId: supplierId ? Number(supplierId) : null, quantity: qty, reference: reference || undefined, notes: notes || undefined });
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title="Purchase Stock"
      subtitle="Supplier delivery increases inventory and creates a traceable stock movement"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button onClick={submit} loading={loading}><Truck className="h-4 w-4" /> Record Purchase</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Select label="Fuel" value={fuelId} onChange={(e) => setFuelId(e.target.value)} placeholder="Select fuel" options={fuels.map((f) => ({ value: f.id, label: f.name }))} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Select label="Supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="No supplier" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
        <div>
          <Input type="number" step="1" min={1} label="Quantity (litres)" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div>
          <Input label="Reference (PO / invoice)" placeholder="PO-2026-001" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Input label="Notes (optional)" placeholder="Delivery notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="col-span-2 text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

function AdjustmentModal({
  open,
  onClose,
  fuels,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  fuels: Fuel[];
  onSave: (v: { fuelId: number; quantity: number; reason: string }) => void;
  loading: boolean;
}) {
  const [fuelId, setFuelId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFuelId(''); setQuantity(''); setReason(''); setError(null);
  };

  const submit = () => {
    const qty = Number(quantity);
    if (!fuelId) return setError('Select a fuel');
    if (qty === 0 || !Number.isFinite(qty)) return setError('Quantity cannot be zero');
    if (!reason.trim()) return setError('A reason is required for stock adjustments');
    onSave({ fuelId: Number(fuelId), quantity: qty, reason: reason.trim() });
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title="Stock Adjustment"
      subtitle="Positive values add stock, negative values remove it"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button onClick={submit} loading={loading}><ArrowRightLeft className="h-4 w-4" /> Apply Adjustment</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Fuel" value={fuelId} onChange={(e) => setFuelId(e.target.value)} placeholder="Select fuel" options={fuels.map((f) => ({ value: f.id, label: f.name }))} />
        <Input type="number" step="0.1" label="Quantity (litres, can be negative)" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="-50 or +100" />
        <Input label="Reason" placeholder="Calibration correction, spillage, delivery variance…" value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <p className="text-xs text-danger">{error}</p>}
        <p className="flex items-center gap-1.5 text-xs text-petrol-400"><AlertTriangle className="h-3.5 w-3.5" /> Adjustments are audited and cannot bring stock below zero.</p>
      </div>
    </Modal>
  );
}
