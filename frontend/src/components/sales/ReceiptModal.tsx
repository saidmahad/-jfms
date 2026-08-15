import { Printer, Download, X } from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { formatCurrency, formatDateTime } from '../../lib/format.ts';
import type { Sale } from '../../types/index.ts';

export interface ReceiptInfo {
  stationName: string;
  stationAddress: string;
  stationPhone: string;
  receiptFooter: string;
  currency: string;
}

export function ReceiptModal({
  sale,
  receipt,
  onClose,
  onNewSale,
}: {
  sale: Sale;
  receipt: ReceiptInfo;
  onClose: () => void;
  onNewSale?: () => void;
}) {
  const print = () => window.print();

  return (
    <div className="print-area mx-auto max-w-xs rounded-xl border border-petrol-100 dark:border-petrol-800 bg-white p-6 text-petrol-900">
      <div className="text-center">
        <p className="font-display text-lg font-extrabold tracking-wide text-petrol-900">{receipt.stationName}</p>
        {receipt.stationAddress && <p className="text-[11px] text-petrol-500">{receipt.stationAddress}</p>}
        {receipt.stationPhone && <p className="text-[11px] text-petrol-500">{receipt.stationPhone}</p>}
        <div className="my-3 border-t border-dashed border-petrol-200" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-petrol-400">Sale Receipt</p>
      </div>

      <div className="mt-3 space-y-1 text-[12px]">
        <div className="flex justify-between"><span className="text-petrol-500">Sale ID</span><span className="font-bold">#{sale.id}</span></div>
        <div className="flex justify-between"><span className="text-petrol-500">Date</span><span>{formatDateTime(sale.saleDate)}</span></div>
        <div className="flex justify-between"><span className="text-petrol-500">Pump</span><span>{sale.pumpNumber}</span></div>
        <div className="flex justify-between"><span className="text-petrol-500">Attendant</span><span>{sale.employeeName ?? '—'}</span></div>
        {sale.customerName && (
          <div className="flex justify-between"><span className="text-petrol-500">Customer</span><span>{sale.customerName}</span></div>
        )}
      </div>

      <div className="my-3 border-t border-dashed border-petrol-200" />

      <div className="space-y-1 text-[12px]">
        <div className="flex justify-between font-semibold"><span>{sale.fuelName}</span><span>{sale.litres} L</span></div>
        <div className="flex justify-between text-petrol-500">
          <span>Price per litre</span><span>{formatCurrency(sale.pricePerLitre, receipt.currency)}</span>
        </div>
        <div className="flex justify-between text-petrol-500">
          <span>Subtotal</span><span>{formatCurrency(sale.totalAmount, receipt.currency)}</span>
        </div>
      </div>

      <div className="my-3 border-t border-dashed border-petrol-200" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">TOTAL</span>
        <span className="font-display text-xl font-extrabold text-petrol-900">{formatCurrency(sale.totalAmount, receipt.currency)}</span>
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-petrol-500">
        <span className="capitalize">{sale.paymentMethod.replace('_', ' ')}</span>
        <span className="font-semibold uppercase">{sale.paymentStatus}</span>
      </div>

      {receipt.receiptFooter && (
        <>
          <div className="my-3 border-t border-dashed border-petrol-200" />
          <p className="text-center text-[11px] text-petrol-500">{receipt.receiptFooter}</p>
        </>
      )}

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={print}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button variant="outline" size="sm" onClick={print}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
        {onNewSale && (
          <Button size="sm" onClick={onNewSale}>
            New Sale
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" /> Close
        </Button>
      </div>
      <p className="mt-2 text-center text-[11px] text-petrol-400 print:hidden">
        Print or choose “Save as PDF” in the print dialog to download.
      </p>
    </div>
  );
}
