import type { Request, Response } from 'express';
import { createSale, getSaleById, listSales, updateSalePaymentStatus } from '../services/sale.service.ts';
import { auditContext } from '../services/audit.service.ts';
import { getSettings } from '../services/settings.service.ts';
import type { AuthUser } from '../types/express.d.ts';

export function listSalesController(req: Request, res: Response): void {
  const user = req.user!;
  const q = req.query as Record<string, string | undefined>;
  const ownOnly = user.role === 'ATTENDANT';
  const result = listSales({
    page: Number(q.page ?? 1),
    perPage: Number(q.perPage ?? 20),
    from: q.from,
    to: q.to,
    employeeId: ownOnly ? (user.employeeId ?? undefined) : q.employeeId ? Number(q.employeeId) : undefined,
    pumpId: q.pumpId ? Number(q.pumpId) : undefined,
    fuelId: q.fuelId ? Number(q.fuelId) : undefined,
    paymentMethod: q.paymentMethod,
    search: q.search,
    ownOnly,
  });

  res.json({ success: true, message: 'Sales loaded', data: result });
}

export function getSaleController(req: Request, res: Response): void {
  const sale = getSaleById(Number(req.params.id));
  const settings = getSettings();
  res.json({
    success: true,
    message: 'Sale loaded',
    data: {
      sale,
      receipt: {
        stationName: settings.station_name,
        stationAddress: settings.station_address,
        stationPhone: settings.station_phone,
        receiptFooter: settings.receipt_footer,
        currency: settings.currency,
      },
    },
  });
}

export function createSaleController(req: Request, res: Response): void {
  const user = req.user as AuthUser;
  const sale = createSale(user, req.body, auditContext(req));
  res.status(201).json({ success: true, message: 'Sale completed successfully', data: sale });
}

export function updatePaymentStatusController(req: Request, res: Response): void {
  const sale = updateSalePaymentStatus(
    Number(req.params.id),
    (req.body as { paymentStatus: 'paid' | 'pending' | 'cancelled' }).paymentStatus,
    auditContext(req),
  );
  res.json({ success: true, message: 'Payment status updated', data: sale });
}
