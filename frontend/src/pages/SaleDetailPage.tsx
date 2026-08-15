import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.tsx';
import { Badge, statusTone } from '../components/ui/Badge.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Select } from '../components/ui/Select.tsx';
import { PageLoader } from '../components/ui/Spinner.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { ReceiptModal, type ReceiptInfo } from '../components/sales/ReceiptModal.tsx';
import { formatCurrency, formatDateTime, formatLitres } from '../lib/format.ts';
import type { Sale } from '../types/index.ts';
import { hasPermission } from '../lib/permissions.ts';

export default function SaleDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReceipt, setShowReceipt] = useState(false);

  const saleQuery = useQuery({
    queryKey: ['sales', 'detail', id],
    queryFn: async () => {
      const res = await api.get<{ data: { sale: Sale; receipt: ReceiptInfo } }>(`/sales/${id}`);
      return res.data.data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (paymentStatus: string) => {
      const res = await api.patch<{ data: Sale }>(`/sales/${id}/payment-status`, { paymentStatus });
      return res.data.data;
    },
    onSuccess: () => {
      toast('Payment status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['sales', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  if (saleQuery.isLoading) return <PageLoader />;
  if (saleQuery.isError || !saleQuery.data) {
    return <ErrorState message={errorMessage(saleQuery.error)} onRetry={() => saleQuery.refetch()} />;
  }

  const { sale, receipt } = saleQuery.data;
  const canUpdateStatus = user && hasPermission(user.role, 'sales.view');

  return (
    <div>
      <PageHeader
        title={`Sale #${sale.id}`}
        description="Sale receipt and transaction details"
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Link to="/sales">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4" /> Back to sales
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Transaction Details" subtitle={`Recorded ${formatDateTime(sale.saleDate)}`} />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div><dt className="label">Sale ID</dt><dd className="font-bold text-petrol-900 dark:text-white">#{sale.id}</dd></div>
              <div><dt className="label">Pump</dt><dd className="font-semibold">{sale.pumpNumber}</dd></div>
              <div><dt className="label">Fuel</dt><dd className="font-semibold">{sale.fuelName}</dd></div>
              <div><dt className="label">Litres</dt><dd className="font-semibold">{formatLitres(sale.litres)}</dd></div>
              <div><dt className="label">Price per litre</dt><dd className="font-semibold">{formatCurrency(sale.pricePerLitre)}</dd></div>
              <div><dt className="label">Subtotal</dt><dd className="font-semibold">{formatCurrency(sale.subtotal)}</dd></div>
              <div><dt className="label">Attendant</dt><dd className="font-semibold">{sale.employeeName ?? '—'}</dd></div>
              <div><dt className="label">Customer</dt><dd className="font-semibold">{sale.customerName ?? 'Walk-in'}</dd></div>
              {sale.vehicleNumber && (
                <div><dt className="label">Vehicle</dt><dd className="font-semibold">{sale.vehicleNumber}</dd></div>
              )}
              <div><dt className="label">Payment method</dt><dd className="font-semibold capitalize">{sale.paymentMethod.replace('_', ' ')}</dd></div>
            </dl>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-petroleum-gradient p-4 text-white">
              <span className="text-sm font-semibold">TOTAL</span>
              <span className="font-display text-2xl font-extrabold">{formatCurrency(sale.totalAmount)}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Payment" subtitle="Update the payment status when needed" />
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="label mb-0">Current status</span>
              <Badge tone={statusTone(sale.paymentStatus)}>{sale.paymentStatus}</Badge>
            </div>
            {canUpdateStatus ? (
              <Select
                value={sale.paymentStatus}
                onChange={(e) => updateStatus.mutate(e.target.value)}
                options={[
                  { value: 'paid', label: 'Paid' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            ) : (
              <p className="text-xs text-petrol-400">You do not have permission to change payment status.</p>
            )}
            <p className="text-xs text-petrol-400">
              Fuel has already been dispensed, so changing the payment status does not adjust inventory.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setShowReceipt(true)}>
              <Printer className="h-4 w-4" /> View printable receipt
            </Button>
          </CardBody>
        </Card>
      </div>

      {showReceipt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-petrol-950/50 p-4 backdrop-blur-sm" onClick={() => setShowReceipt(false)}>
          <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 dark:bg-petrol-900 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <ReceiptModal sale={sale} receipt={receipt} onClose={() => setShowReceipt(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
