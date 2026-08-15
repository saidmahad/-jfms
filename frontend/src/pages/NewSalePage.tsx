import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Fuel,
  Gauge,
  Plus,
  Minus,
  CheckCircle2,
  ShoppingCart,
  User as UserIcon,
} from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Select } from '../components/ui/Select.tsx';
import { Input } from '../components/ui/Input.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { ReceiptModal, type ReceiptInfo } from '../components/sales/ReceiptModal.tsx';
import { cn } from '../lib/utils.ts';
import { formatCurrency, formatLitres } from '../lib/format.ts';
import type { Customer, Fuel as FuelType, Pump, Sale } from '../types/index.ts';

const QUICK_LITRES = [10, 20, 30, 50, 100];

export default function NewSalePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pumpId, setPumpId] = useState<number | null>(null);
  const [fuelId, setFuelId] = useState<number | null>(null);
  const [litres, setLitres] = useState<string>('20');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [customerId, setCustomerId] = useState<string>('');
  const [receipt, setReceipt] = useState<{ sale: Sale; info: ReceiptInfo } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pumpsQuery = useQuery({
    queryKey: ['pumps'],
    queryFn: async () => {
      const res = await api.get<{ data: Pump[] }>('/pumps');
      return res.data.data;
    },
  });

  const fuelsQuery = useQuery({
    queryKey: ['fuels', { pos: true }],
    queryFn: async () => {
      const res = await api.get<{ data: { items: FuelType[] } }>('/fuels', { params: { perPage: 100 } });
      return res.data.data.items;
    },
  });

  const customersQuery = useQuery({
    queryKey: ['customers', { pos: true }],
    queryFn: async () => {
      const res = await api.get<{ data: Customer[] }>('/customers');
      return res.data.data;
    },
    enabled: !!user && user.role !== 'ATTENDANT',
  });

  const pumps = useMemo(() => pumpsQuery.data ?? [], [pumpsQuery.data]);
  const fuels = useMemo(() => (fuelsQuery.data ?? []).filter((f) => f.status === 'active'), [fuelsQuery.data]);

  // Auto-select the first active pump (attendants get their own).
  useEffect(() => {
    if (pumpId === null && pumps.length > 0) {
      setPumpId(pumps[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pumps.length]);

  const selectedPump = pumps.find((p) => p.id === pumpId);
  const selectedFuel = fuels.find((f) => f.id === fuelId) ?? fuels.find((f) => f.id === selectedPump?.fuelId);

  // When a pump is chosen, prefill its fuel.
  useEffect(() => {
    if (selectedPump?.fuelId) {
      setFuelId((prev) => prev ?? selectedPump.fuelId!);
    }
  }, [selectedPump?.fuelId, selectedPump?.id]);

  const litresNum = Number(litres);
  const total = Number.isFinite(litresNum) && litresNum > 0 && selectedFuel ? litresNum * selectedFuel.pricePerLitre : 0;
  const canSell = selectedPump?.status === 'active' && !!selectedFuel && litresNum > 0 && litresNum <= (selectedFuel.currentQuantity ?? 0);

  const createSale = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: Sale }>('/sales', {
        pumpId: selectedPump!.id,
        fuelId: selectedFuel!.id,
        litres: litresNum,
        customerId: customerId ? Number(customerId) : null,
        paymentMethod,
        paymentStatus,
      });
      return res.data.data;
    },
    onSuccess: async (sale) => {
      const infoRes = await api.get<{ data: { sale: Sale; receipt: ReceiptInfo } }>(`/sales/${sale.id}`);
      setReceipt({ sale: infoRes.data.data.sale, info: infoRes.data.data.receipt });
      toast('Transaction completed successfully', 'success');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['fuels'] }),
        queryClient.invalidateQueries({ queryKey: ['pumps'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
      setSubmitting(false);
    },
    onError: (err) => {
      toast(errorMessage(err, 'Sale failed'), 'error');
      setSubmitting(false);
    },
  });

  const confirm = async () => {
    if (!canSell || !selectedPump || !selectedFuel) return;
    setSubmitting(true);
    createSale.mutate();
  };

  const resetForm = () => {
    setReceipt(null);
    setLitres('20');
    setCustomerId('');
    setPaymentMethod('cash');
    setPaymentStatus('paid');
    setFuelId(null);
    setPumpId((prev) => prev);
  };

  if (pumpsQuery.isLoading || fuelsQuery.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="skeleton h-64" />
        <div className="skeleton h-64" />
        <div className="skeleton h-96" />
      </div>
    );
  }

  if (pumpsQuery.isError) {
    return <ErrorState message={errorMessage(pumpsQuery.error)} onRetry={() => pumpsQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader
        title="New Sale"
        description="Record a fuel sale at the pump. Prices and totals are calculated by the system."
        actions={
          <Button variant="outline" onClick={resetForm} disabled={!receipt}>
            Reset
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Pump selection */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader title="Select Pump" subtitle="Only active pumps can process sales" />
            <CardBody className="space-y-2.5">
              {pumps.length === 0 ? (
                <EmptyState title="No pumps found" description="Add a pump in Pump Management first." />
              ) : (
                pumps.map((p) => {
                  const active = p.status === 'active';
                  const selected = p.id === pumpId;
                  return (
                    <button
                      key={p.id}
                      disabled={!active}
                      onClick={() => {
                        setPumpId(p.id);
                        setFuelId(p.fuelId);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
                        selected
                          ? 'border-energy-500 bg-energy-500/[0.06] shadow-glow-sm'
                          : 'border-petrol-100 dark:border-petrol-800 hover:border-petrol-300 dark:hover:border-petrol-600',
                        !active && 'cursor-not-allowed opacity-45',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                          selected ? 'bg-energy-500 text-white' : 'bg-petrol-100 dark:bg-petrol-800 text-petrol-500',
                        )}
                      >
                        <Gauge className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-sm font-bold text-petrol-900 dark:text-white">{p.pumpNumber}</span>
                        <span className="block text-xs text-petrol-500 dark:text-petrol-400">
                          {p.fuelName ?? 'No fuel'} · {formatLitres(p.currentReading)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'h-2.5 w-2.5 shrink-0 rounded-full',
                          active ? 'bg-success' : 'bg-slate-400',
                          active && selected && 'animate-pulse-soft',
                        )}
                      />
                    </button>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>

        {/* Fuel + litres */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader title="Fuel & Litres" subtitle="Select fuel then enter the amount dispensed" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {fuels.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFuelId(f.id)}
                    disabled={f.status !== 'active'}
                    className={cn(
                      'rounded-xl border p-3.5 text-left transition-all',
                      fuelId === f.id
                        ? 'border-energy-500 bg-energy-500/[0.06] shadow-glow-sm'
                        : 'border-petrol-100 dark:border-petrol-800 hover:border-petrol-300 dark:hover:border-petrol-600',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Fuel className={cn('h-4 w-4', fuelId === f.id ? 'text-energy-500' : 'text-petrol-400')} />
                      <span className="font-display text-sm font-bold text-petrol-900 dark:text-white">{f.name}</span>
                    </span>
                    <span className="mt-1 block text-xs text-petrol-500 dark:text-petrol-400">
                      {formatCurrency(f.pricePerLitre)}/L
                    </span>
                    <span className="mt-0.5 block text-[11px] text-petrol-400">{formatLitres(f.currentQuantity)} available</span>
                  </button>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Litres dispensed</label>
                  <span className="text-xs text-petrol-400">
                    {selectedFuel ? `${formatLitres(selectedFuel.currentQuantity)} available` : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="md" onClick={() => setLitres((v) => String(Math.max(0, Number(v) - 5)))} aria-label="Decrease litres">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={litres}
                    onChange={(e) => setLitres(e.target.value)}
                    className="text-center font-display text-lg font-bold"
                    aria-label="Litres"
                  />
                  <Button variant="outline" size="md" onClick={() => setLitres((v) => String(Number(v) + 5))} aria-label="Increase litres">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {QUICK_LITRES.map((q) => (
                    <button
                      key={q}
                      onClick={() => setLitres(String(q))}
                      className={cn(
                        'rounded-lg border py-1.5 text-xs font-semibold transition-colors',
                        litresNum === q
                          ? 'border-energy-500 bg-energy-500 text-white'
                          : 'border-petrol-200 dark:border-petrol-700 text-petrol-600 dark:text-slate-300 hover:border-energy-400',
                      )}
                    >
                      {q}L
                    </button>
                  ))}
                </div>
              </div>

              {selectedFuel && Number(litres) > selectedFuel.currentQuantity && (
                <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
                  Cannot sell more than available inventory ({formatLitres(selectedFuel.currentQuantity)}).
                </p>
              )}
              {selectedPump && selectedPump.status !== 'active' && (
                <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {selectedPump.pumpNumber} is {selectedPump.status} and cannot process sales.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-4">
          <Card className="sticky top-20">
            <CardHeader title="Transaction Summary" />
            <CardBody className="space-y-4">
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-petrol-500 dark:text-petrol-400">Pump</dt>
                  <dd className="font-semibold text-petrol-900 dark:text-white">{selectedPump?.pumpNumber ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-petrol-500 dark:text-petrol-400">Fuel</dt>
                  <dd className="font-semibold text-petrol-900 dark:text-white">{selectedFuel?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-petrol-500 dark:text-petrol-400">Price per litre</dt>
                  <dd className="font-semibold text-petrol-900 dark:text-white">
                    {selectedFuel ? formatCurrency(selectedFuel.pricePerLitre) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-petrol-500 dark:text-petrol-400">Litres</dt>
                  <dd className="font-semibold text-petrol-900 dark:text-white">{litresNum > 0 ? `${litresNum} L` : '—'}</dd>
                </div>
                <div className="flex justify-between border-t border-petrol-100 dark:border-petrol-800 pt-2.5">
                  <dt className="font-bold text-petrol-900 dark:text-white">Total</dt>
                  <dd className="font-display text-2xl font-extrabold text-petrol-900 dark:text-white">{formatCurrency(total)}</dd>
                </div>
              </dl>

              <div className="space-y-3">
                <Select
                  label="Payment method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'mobile_money', label: 'Mobile Money' },
                    { value: 'rfid', label: 'RFID' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
                <Select
                  label="Payment status"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  options={[
                    { value: 'paid', label: 'Paid' },
                    { value: 'pending', label: 'Pending' },
                  ]}
                />
                {user?.role !== 'ATTENDANT' && (
                  <Select
                    label="Customer (optional)"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="Walk-in customer"
                    options={(customersQuery.data ?? []).map((c) => ({ value: c.id, label: c.fullName }))}
                  />
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={confirm}
                disabled={!canSell}
                loading={submitting}
              >
                <ShoppingCart className="h-5 w-5" /> Confirm Sale
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-petrol-400">
                <UserIcon className="h-3 w-3" />
                Attendant: {user?.employeeName ?? user?.username} · totals verified by server
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Success receipt */}
      {receipt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-petrol-950/50 p-4 backdrop-blur-sm" onClick={() => setReceipt(null)}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-petrol-900 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-petrol-900 dark:text-white">Transaction completed successfully</p>
                <p className="text-xs text-petrol-500 dark:text-petrol-400">Sale #{receipt.sale.id} · {receipt.sale.fuelName} · {receipt.sale.litres} L</p>
              </div>
            </div>
            <ReceiptModal sale={receipt.sale} receipt={receipt.info} onClose={() => setReceipt(null)} onNewSale={resetForm} />
          </div>
        </div>
      )}
    </div>
  );
}
