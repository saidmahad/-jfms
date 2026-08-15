import type { Request, Response } from 'express';
import { getDashboard, getDashboardCharts } from '../services/dashboard.service.ts';
import { getSettings } from '../services/settings.service.ts';

export function getDashboardData(req: Request, res: Response): void {
  const settings = getSettings();
  const data = getDashboard(req.user!);
  res.json({
    success: true,
    message: 'Dashboard loaded',
    data: {
      stationName: settings.station_name,
      ...data,
    },
  });
}

export function getDashboardChartsData(req: Request, res: Response): void {
  const range = req.query.range === 'day' || req.query.range === 'month' ? req.query.range : 'week';
  res.json({
    success: true,
    message: 'Charts loaded',
    data: getDashboardCharts(req.user!, range),
  });
}
