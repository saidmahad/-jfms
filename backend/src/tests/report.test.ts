import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, loginAdmin, authGet, authPost, authPatch } from './helpers.ts';

describe('Reports', () => {
  beforeEach(() => resetDb());

  it('computes sales totals from real data', async () => {
    const admin = await loginAdmin();
    // Petrol is $1.25/L on pump 1.
    await authPost(admin.token, '/api/sales', { pumpId: 1, fuelId: 1, litres: 100, paymentMethod: 'cash', employeeId: 4 });
    await authPost(admin.token, '/api/sales', { pumpId: 1, fuelId: 1, litres: 40, paymentMethod: 'card', employeeId: 4 });
    // Diesel is $1.15/L on pump 3.
    await authPost(admin.token, '/api/sales', { pumpId: 3, fuelId: 2, litres: 200, paymentMethod: 'cash', employeeId: 4 });

    const res = await authGet(admin.token, '/api/reports/sales');
    expect(res.status).toBe(200);
    const summary = res.body.data.report.summary;
    expect(summary.totalSales).toBe(3);
    expect(summary.totalRevenue).toBeCloseTo(100 * 1.25 + 40 * 1.25 + 200 * 1.15, 2);
    expect(summary.totalLitres).toBeCloseTo(340, 2);
  });

  it('computes revenue, expenses and net profit', async () => {
    const admin = await loginAdmin();
    await authPost(admin.token, '/api/sales', { pumpId: 1, fuelId: 1, litres: 100, paymentMethod: 'cash', employeeId: 4 });
    await authPost(admin.token, '/api/expenses', { category: 'electricity', description: 'Power', amount: 25, expenseDate: '2026-08-15' });
    await authPost(admin.token, '/api/expenses', { category: 'rent', description: 'Rent', amount: 100, expenseDate: '2026-08-15' });

    const res = await authGet(admin.token, '/api/reports/revenue');
    expect(res.status).toBe(200);
    const summary = res.body.data.report.summary;
    expect(summary.totalRevenue).toBeCloseTo(125, 2);
    expect(summary.totalExpenses).toBeCloseTo(125, 2);
    expect(summary.netProfit).toBeCloseTo(0, 2);
    expect(res.body.data.report.byCategory.length).toBe(2);
  });

  it('excludes cancelled sales from revenue', async () => {
    const admin = await loginAdmin();
    const created = await authPost(admin.token, '/api/sales', {
      pumpId: 1,
      fuelId: 1,
      litres: 100,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      employeeId: 4,
    });
    await authPatch(admin.token, `/api/sales/${created.body.data.id}/payment-status`, { paymentStatus: 'cancelled' });

    const res = await authGet(admin.token, '/api/reports/revenue');
    expect(res.body.data.report.summary.totalRevenue).toBe(0);
  });

  it('produces an inventory report with purchased and sold volumes', async () => {
    const admin = await loginAdmin();
    await authPost(admin.token, '/api/inventory/purchase', { fuelId: 1, quantity: 1000, supplierId: 1 });
    await authPost(admin.token, '/api/sales', { pumpId: 1, fuelId: 1, litres: 100, paymentMethod: 'cash', employeeId: 4 });

    const res = await authGet(admin.token, '/api/reports/inventory');
    expect(res.status).toBe(200);
    const report = res.body.data.report;
    expect(report.summary.purchased).toBeCloseTo(1000, 2);
    expect(report.summary.sold).toBeCloseTo(100, 2);
    const petrol = report.perFuel.find((f: { name: string }) => f.name === 'Petrol');
    expect(petrol.purchased).toBeCloseTo(1000, 2);
    expect(petrol.sold).toBeCloseTo(100, 2);
  });

  it('produces employee and pump performance reports', async () => {
    const admin = await loginAdmin();
    await authPost(admin.token, '/api/sales', { pumpId: 1, fuelId: 1, litres: 50, paymentMethod: 'cash', employeeId: 4 });

    const employees = await authGet(admin.token, '/api/reports/employees');
    const emp4 = employees.body.data.report.employees.find((e: { id: number }) => e.id === 4);
    expect(emp4.sales).toBe(1);
    expect(emp4.revenue).toBeCloseTo(62.5, 2);

    const pumps = await authGet(admin.token, '/api/reports/pumps');
    const pump1 = pumps.body.data.report.pumps.find((p: { pumpNumber: string }) => p.pumpNumber === 'PUMP-01');
    expect(pump1.sales).toBe(1);
    expect(pump1.litres).toBeCloseTo(50, 2);
  });

  it('returns report metadata with station branding', async () => {
    const admin = await loginAdmin();
    const res = await authGet(admin.token, '/api/reports/sales?from=2026-08-01&to=2026-08-31');
    expect(res.body.data.meta.stationName).toBe('JUPA Fuel Station');
    expect(res.body.data.meta.generatedBy).toBe('admin');
    expect(res.body.data.meta.range.from).toBe('2026-08-01');
  });
});
