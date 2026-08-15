import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/index.ts';
import { resetDb, loginAdmin, authGet, authPost, authPut, authPatch } from './helpers.ts';

describe('Employees', () => {
  beforeEach(() => resetDb());

  it('creates an employee', async () => {
    const admin = await loginAdmin();
    const res = await authPost(admin.token, '/api/employees', {
      fullName: 'Test Employee',
      phone: '+1-555-0999',
      position: 'Fuel Attendant',
      salary: 1200,
      hireDate: '2026-01-01',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.fullName).toBe('Test Employee');
    expect(res.body.data.position).toBe('Fuel Attendant');
  });

  it('rejects invalid employee payloads', async () => {
    const admin = await loginAdmin();
    const badRole = await authPost(admin.token, '/api/employees', {
      fullName: 'X',
      position: 'NotARealPosition',
      salary: 100,
      hireDate: '2026-01-01',
    });
    expect(badRole.status).toBe(422);

    const negativeSalary = await authPost(admin.token, '/api/employees', {
      fullName: 'Y',
      position: 'Fuel Attendant',
      salary: -10,
      hireDate: '2026-01-01',
    });
    expect(negativeSalary.status).toBe(422);
  });

  it('updates an employee', async () => {
    const admin = await loginAdmin();
    const created = await authPost(admin.token, '/api/employees', {
      fullName: 'Before Name',
      position: 'Fuel Attendant',
      salary: 1000,
      hireDate: '2026-01-01',
    });
    const id = created.body.data.id;

    const res = await authPut(admin.token, `/api/employees/${id}`, {
      fullName: 'After Name',
      position: 'Supervisor',
      salary: 1500,
      hireDate: '2026-01-01',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('After Name');
    expect(res.body.data.position).toBe('Supervisor');
  });

  it('deactivates an employee', async () => {
    const admin = await loginAdmin();
    const res = await authPatch(admin.token, '/api/employees/3/status', { status: 'inactive' });
    expect(res.status).toBe(200);
    const row = db.prepare(`SELECT status FROM employees WHERE id = 3`).get() as { status: string };
    expect(row.status).toBe('inactive');
  });

  it('returns employee sales performance in the list', async () => {
    const admin = await loginAdmin();
    await authPost(admin.token, '/api/sales', {
      pumpId: 1,
      fuelId: 1,
      litres: 100,
      paymentMethod: 'cash',
      employeeId: 4,
    });
    const res = await authGet(admin.token, '/api/employees');
    const emp4 = res.body.data.find((e: { id: number }) => e.id === 4);
    expect(emp4.totalSales).toBe(1);
    expect(emp4.totalLitres).toBeCloseTo(100, 3);
    expect(emp4.totalRevenue).toBeGreaterThan(0);
  });
});
