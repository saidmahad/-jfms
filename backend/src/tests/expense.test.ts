import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, loginAdmin, loginManager, authGet, authPost } from './helpers.ts';

describe('Expenses', () => {
  beforeEach(() => resetDb());

  it('creates an expense', async () => {
    const admin = await loginAdmin();
    const res = await authPost(admin.token, '/api/expenses', {
      category: 'electricity',
      description: 'Monthly power bill',
      amount: 250.5,
      expenseDate: '2026-08-15',
      paymentMethod: 'cash',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(250.5);
    expect(res.body.data.category).toBe('electricity');
  });

  it('rejects negative amounts and invalid categories', async () => {
    const admin = await loginAdmin();
    const negative = await authPost(admin.token, '/api/expenses', {
      category: 'rent',
      description: 'Bad expense',
      amount: -10,
      expenseDate: '2026-08-15',
    });
    expect(negative.status).toBe(422);

    const invalidCat = await authPost(admin.token, '/api/expenses', {
      category: 'gambling',
      description: 'Bad category',
      amount: 10,
      expenseDate: '2026-08-15',
    });
    expect(invalidCat.status).toBe(422);
  });

  it('rejects zero amount', async () => {
    const admin = await loginAdmin();
    const res = await authPost(admin.token, '/api/expenses', {
      category: 'other',
      description: 'Zero amount',
      amount: 0,
      expenseDate: '2026-08-15',
    });
    expect(res.status).toBe(422);
  });

  it('lists expenses with a summary total', async () => {
    const manager = await loginManager();
    await authPost(manager.token, '/api/expenses', { category: 'salaries', description: 'Salaries', amount: 1000, expenseDate: '2026-08-14' });
    await authPost(manager.token, '/api/expenses', { category: 'transport', description: 'Transport', amount: 200, expenseDate: '2026-08-15' });

    const res = await authGet(manager.token, '/api/expenses');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.summary.totalAmount).toBe(1200);
  });

  it('filters expenses by category and date', async () => {
    const manager = await loginManager();
    await authPost(manager.token, '/api/expenses', { category: 'salaries', description: 'A', amount: 1000, expenseDate: '2026-08-14' });
    await authPost(manager.token, '/api/expenses', { category: 'transport', description: 'B', amount: 200, expenseDate: '2026-08-15' });

    const res = await authGet(manager.token, '/api/expenses?category=transport');
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].category).toBe('transport');
  });
});
