import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/index.ts';
import { resetDb, loginAdmin, loginAttendant, authGet, authPost } from './helpers.ts';

function fuelRow(id: number) {
  return db.prepare(`SELECT * FROM fuels WHERE id = ?`).get(id) as { id: number; name: string; current_quantity: number; minimum_stock: number };
}

describe('Inventory', () => {
  beforeEach(() => resetDb());

  it('increases stock on purchase and records the movement', async () => {
    const admin = await loginAdmin();
    const before = fuelRow(1);

    const res = await authPost(admin.token, '/api/inventory/purchase', {
      fuelId: 1,
      supplierId: 1,
      quantity: 500,
      reference: 'PO-1001',
    });
    expect(res.status).toBe(201);
    expect(fuelRow(1).current_quantity).toBeCloseTo(before.current_quantity + 500, 3);

    const movement = db.prepare(
      `SELECT * FROM inventory_transactions WHERE type = 'purchase' AND fuel_id = 1`,
    ).get() as { reference: string | null; supplier_id: number | null };
    expect(movement).toBeTruthy();
    expect(movement.supplier_id).toBe(1);
    expect(movement.reference).toBe('PO-1001');
  });

  it('rejects purchases with zero or negative quantity', async () => {
    const admin = await loginAdmin();
    const zero = await authPost(admin.token, '/api/inventory/purchase', { fuelId: 1, quantity: 0 });
    expect(zero.status).toBe(422);
    const negative = await authPost(admin.token, '/api/inventory/purchase', { fuelId: 1, quantity: -5 });
    expect(negative.status).toBe(422);
  });

  it('applies positive adjustments', async () => {
    const admin = await loginAdmin();
    const before = fuelRow(2);
    const res = await authPost(admin.token, '/api/inventory/adjustment', {
      fuelId: 2,
      quantity: 100,
      reason: 'Calibration correction',
    });
    expect(res.status).toBe(200);
    expect(fuelRow(2).current_quantity).toBeCloseTo(before.current_quantity + 100, 3);
  });

  it('rejects adjustments that would bring stock below zero', async () => {
    const admin = await loginAdmin();
    const res = await authPost(admin.token, '/api/inventory/adjustment', {
      fuelId: 1,
      quantity: -100000,
      reason: 'Test over-adjustment',
    });
    expect(res.status).toBe(422);
    expect(fuelRow(1).current_quantity).toBe(12000);
  });

  it('requires a reason for adjustments', async () => {
    const admin = await loginAdmin();
    const res = await authPost(admin.token, '/api/inventory/adjustment', {
      fuelId: 1,
      quantity: 10,
      reason: '',
    });
    expect(res.status).toBe(422);
  });

  it('flags low stock and creates an alert notification', async () => {
    const admin = await loginAdmin();
    db.prepare(`UPDATE fuels SET minimum_stock = 11990, current_quantity = 12000 WHERE id = 1`).run();

    const low = await authGet(admin.token, '/api/inventory/low-stock');
    expect(low.status).toBe(200);
    expect(low.body.data.length).toBe(0);

    // A sale pushes Petrol below its minimum -> alert fires.
    const attendant = await loginAttendant();
    await authPost(attendant.token, '/api/sales', { pumpId: 1, fuelId: 1, litres: 50, paymentMethod: 'cash' });

    const lowAfter = await authGet(admin.token, '/api/inventory/low-stock');
    expect(lowAfter.body.data.some((f: { name: string }) => f.name === 'Petrol')).toBe(true);

    const notifications = db.prepare(
      `SELECT * FROM notifications WHERE type IN ('low_stock', 'critical_stock')`,
    ).all() as { title: string }[];
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0].title).toMatch(/Petrol/);
  });

  it('lists stock movements with fuel names', async () => {
    const admin = await loginAdmin();
    await authPost(admin.token, '/api/inventory/purchase', { fuelId: 1, quantity: 100 });
    const res = await authGet(admin.token, '/api/inventory/movements');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].fuelName).toBe('Petrol');
    expect(res.body.data.items[0].type).toBe('purchase');
  });
});
