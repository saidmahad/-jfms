import type { Request, Response } from 'express';
import { employeeReport, inventoryReport, pumpReport, revenueReport, salesReport, type ReportFilters } from '../services/report.service.ts';
import { getSettings } from '../services/settings.service.ts';
import { qs } from '../utils/query.ts';

function filtersFrom(req: Request): ReportFilters {
  const q = req.query as Record<string, string | undefined>;
  return {
    from: q.from,
    to: q.to,
    employeeId: q.employeeId ? Number(q.employeeId) : undefined,
    pumpId: q.pumpId ? Number(q.pumpId) : undefined,
    fuelId: q.fuelId ? Number(q.fuelId) : undefined,
    paymentMethod: q.paymentMethod,
  };
}

function meta(req: Request) {
  const settings = getSettings();
  return {
    stationName: settings.station_name,
    stationAddress: settings.station_address,
    currency: settings.currency,
    generatedBy: req.user?.username ?? null,
    generatedAt: new Date().toISOString(),
    range: { from: qs(req.query.from) ?? null, to: qs(req.query.to) ?? null },
  };
}

export function salesReportController(req: Request, res: Response): void {
  res.json({
    success: true,
    message: 'Sales report generated',
    data: { report: salesReport(filtersFrom(req)), meta: meta(req) },
  });
}

export function inventoryReportController(req: Request, res: Response): void {
  res.json({
    success: true,
    message: 'Inventory report generated',
    data: {
      report: inventoryReport({ from: qs(req.query.from), to: qs(req.query.to) }),
      meta: meta(req),
    },
  });
}

export function revenueReportController(req: Request, res: Response): void {
  res.json({
    success: true,
    message: 'Revenue report generated',
    data: {
      report: revenueReport({ from: qs(req.query.from), to: qs(req.query.to) }),
      meta: meta(req),
    },
  });
}

export function employeeReportController(req: Request, res: Response): void {
  res.json({
    success: true,
    message: 'Employee report generated',
    data: {
      report: employeeReport({ from: qs(req.query.from), to: qs(req.query.to) }),
      meta: meta(req),
    },
  });
}

export function pumpReportController(req: Request, res: Response): void {
  res.json({
    success: true,
    message: 'Pump report generated',
    data: {
      report: pumpReport({ from: qs(req.query.from), to: qs(req.query.to) }),
      meta: meta(req),
    },
  });
}
