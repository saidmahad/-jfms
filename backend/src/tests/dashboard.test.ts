import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, loginAdmin, loginAttendant, authGet, authPost } from './helpers.ts';

describe('Dashboard', () => {
  beforeEach(() => resetDb());

  it('returns real KPIs and chart data for admins', async () => {
    const admin = await loginAdmin();
    const res = await authGet(admin.token, '/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { kpis, charts, recentTransactions, lowStock } = res.body.data;
    expect(kpis.availableFuel).toBeGreaterThan(0);
    expect(kpis.activePumps).toBeGreaterThan(0);
    expect(typeof kpis.todaySales).toBe('number');
    expect(Array.isArray(charts.salesOverview)).toBe(true);
    expect(Array.isArray(charts.revenueVsExpenses)).toBe(true);
    expect(Array.isArray(charts.fuelDistribution)).toBe(true);
    expect(Array.isArray(charts.pumpPerformance)).toBe(true);
    expect(Array.isArray(recentTransactions)).toBe(true);
    expect(Array.isArray(lowStock)).toBe(true);
  });

  it('returns the dashboard for attendants without errors (scoped to own sales)', async () => {
    const attendant = await loginAttendant();
    const res = await authGet(attendant.token, '/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { kpis, charts } = res.body.data;
    expect(kpis.availableFuel).toBeGreaterThan(0);
    expect(Array.isArray(charts.pumpPerformance)).toBe(true);
    expect(Array.isArray(charts.fuelDistribution)).toBe(true);
  });

  it('updates KPIs and inventory after a sale is created', async () => {
    const admin = await loginAdmin();
    const attendant = await loginAttendant();

    const before = await authGet(attendant.token, '/api/dashboard');
    expect(before.status).toBe(200);
    const salesBefore = before.body.data.kpis.todaySales;

    const fuelBefore = (await authGet(admin.token, '/api/fuels')).body.data.items.find(
      (f: { id: number }) => f.id === 1,
    ).currentQuantity;

    const sale = await authPost(attendant.token, '/api/sales', {
      pumpId: 1,
      fuelId: 1,
      litres: 25,
      paymentMethod: 'cash',
      customerId: null,
    });
    expect(sale.status).toBe(201);

    const after = await authGet(attendant.token, '/api/dashboard');
    expect(after.status).toBe(200);
    expect(after.body.data.kpis.todaySales).toBe(salesBefore + 1);
    expect(after.body.data.kpis.todayRevenue).toBeGreaterThan(0);

    const fuelAfter = (await authGet(admin.token, '/api/fuels')).body.data.items.find(
      (f: { id: number }) => f.id === 1,
    ).currentQuantity;
    expect(fuelAfter).toBe(fuelBefore - 25);
  });
});
