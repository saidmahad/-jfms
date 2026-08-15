import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/index.ts';
import { resetDb, loginAttendant, loginManager, authGet, authPost, authPatch } from './helpers.ts';

function fuelRow(id: number) {
  return db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(id) as { id: number; name: string; current_quantity: number; price_per_litre: number };
}

function pumpRow(id: number) {
  return db.prepare(`SELECT * FROM pumps WHERE id = ?`).get(id) as { id: number; status: string; current_reading: number };
}

function movementCount() {
  return (db.prepare(`SELECT COUNT(*) AS c FROM inventory_transactions`).get() as { c: number }).c;
}

describe('Sales', () => {
  beforeEach(() => resetDb());

  it('creates a valid sale and calculates the total server-side', async () => {
    const attendant = await loginAttendant();
    const before = fuelRow(1);
    const pumpBefore = pumpRow(1);

    const res = await authPost(attendant.token, '/api/sales', {
      pumpId: 1,
      fuelId: 1,
      litres: 50,
      paymentMethod: 'cash',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const sale = res.body.data;
    const expectedTotal = Math.round(50 * before.price_per_litre * 100) / 100;
    expect(sale.totalAmount).toBe(expectedTotal);
    expect(sale.paymentMethod).toBe('cash');
    expect(sale.pumpNumber).toBe('PUMP-01');
    expect(sale.fuelName).toBe('Petrol');

    // Inventory decreased
    const after = fuelRow(1);
    expect(after.current_quantity).toBeCloseTo(before.current_quantity - 50, 3);

    // Pump reading increased
    const pumpAfter = pumpRow(1);
    expect(pumpAfter.current_reading).toBeCloseTo(pumpBefore.current_reading + 50, 3);

    // Traceable stock movement created
    expect(movementCount()).toBe(1);

    // Audit log created
    const audit = db.prepare(`SELECT COUNT(*) AS c FROM audit_logs WHERE action = 'create_sale'`).get() as { c: number };
    expect(audit.c).toBe(1);
  });

  it('rejects sales with zero litres', async () => {
    const attendant = await loginAttendant();
    const res = await authPost(attendant.token, '/api/sales', {
      pumpId: 1,
      fuelId: 1,
      litres: 0,
      paymentMethod: 'cash',
    });
    expect(res.status).toBe(422);
    expect(movementCount()).toBe(0);
  });

  it('rejects sales exceeding available inventory without partial writes', async () => {
    const attendant = await loginAttendant();
    const before = fuelRow(1);

    const res = await authPost(attendant.token, '/api/sales', {
      pumpId: 1,
      fuelId: 1,
      litres: before.current_quantity + 1000,
      paymentMethod: 'cash',
    });
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/insufficient/i);

    // Nothing persisted: no sales, no movements, stock unchanged
    expect(fuelRow(1).current_quantity).toBe(before.current_quantity);
    expect(movementCount()).toBe(0);
    const sales = db.prepare(`SELECT COUNT(*) AS c FROM sales`).get() as { c: number };
    expect(sales.c).toBe(0);
  });

  it('rejects sales through an inactive pump', async () => {
    db.prepare(`UPDATE pumps SET status = 'maintenance' WHERE id = 1`).run();
    const attendant = await loginAttendant();

    const res = await authPost(attendant.token, '/api/sales', {
      pumpId: 1,
      fuelId: 1,
      litres: 10,
      paymentMethod: 'cash',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not active/i);
    expect(movementCount()).toBe(0);
  });

  it('rejects sales from inactive employees', async () => {
    db.prepare(`UPDATE employees SET status = 'inactive' WHERE id = 3`).run(); // attendant's employee
    const attendant = await loginAttendant();

    const res = await authPost(attendant.token, '/api/sales', {
      pumpId: 1,
      fuelId: 1,
      litres: 10,
      paymentMethod: 'cash',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/inactive employee/i);
  });

  it('lists sales with filters and pagination', async () => {
    const attendant = await loginAttendant();
    await authPost(attendant.token, '/api/sales', { pumpId: 1, fuelId: 1, litres: 10, paymentMethod: 'cash' });
    await authPost(attendant.token, '/api/sales', { pumpId: 3, fuelId: 2, litres: 20, paymentMethod: 'mobile_money' });

    const manager = await loginManager();
    const res = await authGet(manager.token, '/api/sales?paymentMethod=cash');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].paymentMethod).toBe('cash');
  });

  it('restricts attendants to their own sales', async () => {
    const attendant = await loginAttendant();
    await authPost(attendant.token, '/api/sales', { pumpId: 1, fuelId: 1, litres: 10, paymentMethod: 'cash' });

    // Manager records a sale for a different employee (employee 4).
    const manager = await loginManager();
    await authPost(manager.token, '/api/sales', { pumpId: 2, fuelId: 1, litres: 5, paymentMethod: 'cash', employeeId: 4 });

    const res = await authGet(attendant.token, '/api/sales');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].employeeId).toBe(attendant.user.employeeId);
  });

  it('supports updating payment status without touching stock', async () => {
    const attendant = await loginAttendant();
    const created = await authPost(attendant.token, '/api/sales', {
      pumpId: 1,
      fuelId: 1,
      litres: 10,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
    });
    const saleId = created.body.data.id;

    const manager = await loginManager();
    const res = await authPatch(manager.token, `/api/sales/${saleId}/payment-status`, { paymentStatus: 'paid' });
    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe('paid');
    expect(fuelRow(1).current_quantity).toBeCloseTo(12000 - 10, 3);
  });
});
