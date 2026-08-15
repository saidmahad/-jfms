import { db, type SqlValue } from '../db/index.ts';
import { toCamelList } from '../utils/case.ts';
import type { AuthUser } from '../types/express.d.ts';
import { evaluateStockLevel } from './notification.service.ts';
import { listLowStock } from './inventory.service.ts';

const startOfUtcDay = (d: Date) => {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

const addDays = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const iso = (d: Date) => d.toISOString();

interface Scoped {
  where: string;
  params: SqlValue[];
}

function scopeFor(user: AuthUser): Scoped {
  if (user.role === 'ATTENDANT') {
    return { where: 'AND s.employee_id = ?', params: [user.employeeId] };
  }
  return { where: '', params: [] };
}

export function getDashboard(user: AuthUser) {
  const now = new Date();
  const todayStart = iso(startOfUtcDay(now));
  const yesterdayStart = iso(startOfUtcDay(addDays(now, -1)));
  const monthStart = iso(startOfUtcDay(new Date(now.getFullYear(), now.getUTCMonth(), 1)));
  const scope = scopeFor(user);

  // ---- KPIs ----
  const todaySalesRow = db.prepare(
    `SELECT COUNT(*) AS sales, COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue
     FROM sales s WHERE s.sale_date >= ? ${scope.where}`,
  ).get(todayStart, ...scope.params) as { sales: number; revenue: number };

  const yesterdayRevenueRow = db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue
     FROM sales s WHERE s.sale_date >= ? AND s.sale_date < ? ${scope.where}`,
  ).get(yesterdayStart, todayStart, ...scope.params) as { revenue: number };

  const todayExpensesRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS expenses FROM expenses WHERE expense_date >= ?`,
  ).get(todayStart) as { expenses: number };

  const monthExpensesRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS expenses FROM expenses WHERE expense_date >= ?`,
  ).get(monthStart) as { expenses: number };

  const monthRevenueRow = db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue
     FROM sales s WHERE s.sale_date >= ? ${scope.where}`,
  ).get(monthStart, ...scope.params) as { revenue: number };

  const fuelRow = db.prepare(
    `SELECT COALESCE(SUM(current_quantity), 0) AS litres FROM fuels WHERE status = 'active'`,
  ).get() as { litres: number };

  const pumpRow = db.prepare(`SELECT COUNT(*) AS active FROM pumps WHERE status = 'active'`).get() as { active: number };
  const empRow = db.prepare(`SELECT COUNT(*) AS active FROM employees WHERE status = 'active'`).get() as { active: number };
  const lowStockRow = db.prepare(`SELECT COUNT(*) AS c FROM fuels WHERE current_quantity <= minimum_stock`).get() as { c: number };

  const todayRevenue = Number(todaySalesRow.revenue);
  const yesterdayRevenue = Number(yesterdayRevenueRow.revenue);
  const todayExpenses = Number(todayExpensesRow.expenses);

  return {
    kpis: {
      todaySales: Number(todaySalesRow.sales),
      todayRevenue,
      todayExpenses,
      netProfit: Math.round((todayRevenue - todayExpenses) * 100) / 100,
      revenueChangePercent: yesterdayRevenue > 0
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10
        : (todayRevenue > 0 ? 100 : 0),
      availableFuel: Number(fuelRow.litres),
      activePumps: Number(pumpRow.active),
      activeEmployees: Number(empRow.active),
      lowStockCount: Number(lowStockRow.c),
      monthRevenue: Number(monthRevenueRow.revenue),
      monthExpenses: Number(monthExpensesRow.expenses),
    },
    charts: getDashboardCharts(user, 'week'),
    recentTransactions: getRecentTransactions(user, 8),
    lowStock: listLowStock(),
  };
}

export function getDashboardCharts(user: AuthUser, range: 'day' | 'week' | 'month' = 'week') {
  const now = new Date();
  const scope = scopeFor(user);
  let from: Date;
  let buckets: { label: string; key: string }[];

  if (range === 'day') {
    from = startOfUtcDay(now);
    buckets = Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, '0')}:00`,
      key: `${String(h).padStart(2, '0')}:00`,
    }));
  } else if (range === 'month') {
    from = startOfUtcDay(addDays(now, -29));
    buckets = Array.from({ length: 30 }, (_, i) => {
      const d = addDays(from, i);
      return { label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, key: d.toISOString().slice(0, 10) };
    });
  } else {
    from = startOfUtcDay(addDays(now, -6));
    buckets = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(from, i);
      return { label: d.toISOString().slice(0, 10), key: d.toISOString().slice(0, 10) };
    });
  }

  const sales = db.prepare(
    `SELECT s.sale_date, s.total_amount, sd.litres, s.payment_status
     FROM sales s JOIN sale_details sd ON sd.sale_id = s.id
     WHERE s.sale_date >= ? ${scope.where}`,
  ).all(iso(from), ...scope.params) as { sale_date: string; total_amount: number; litres: number; payment_status: string }[];

  const salesOverview = buckets.map((b) => {
    let dayKey: string;
    let hourKey: string | null = null;
    if (range === 'day') {
      dayKey = b.key; // "HH:00" -> same day; need date + hour
      const [h] = b.key.split(':');
      hourKey = h;
      dayKey = todayKey();
    } else {
      dayKey = b.key;
    }
    const inBucket = sales.filter((s) => {
      if (range === 'day') return s.sale_date.slice(0, 10) === dayKey && s.sale_date.slice(11, 13) === hourKey;
      return s.sale_date.slice(0, 10) === dayKey;
    });
    const revenue = inBucket.filter((s) => s.payment_status !== 'cancelled').reduce((a, s) => a + s.total_amount, 0);
    const litres = inBucket.reduce((a, s) => a + s.litres, 0);
    return { label: b.label, revenue: Math.round(revenue * 100) / 100, litres: Math.round(litres * 100) / 100, sales: inBucket.length };
  });

  const todayKey = () => iso(now).slice(0, 10);

  // Revenue vs expenses, last 7 days
  const weekStart = iso(startOfUtcDay(addDays(now, -6)));
  const revenueRows = db.prepare(
    `SELECT substr(s.sale_date, 1, 10) AS day, SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END) AS revenue
     FROM sales s WHERE s.sale_date >= ? ${scope.where} GROUP BY day`,
  ).all(weekStart, ...scope.params) as { day: string; revenue: number }[];
  const expenseRows = db.prepare(
    `SELECT substr(expense_date, 1, 10) AS day, SUM(amount) AS amount FROM expenses WHERE expense_date >= ? GROUP BY day`,
  ).all(weekStart) as { day: string; amount: number }[];
  const revenueVsExpenses = Array.from({ length: 7 }, (_, i) => {
    const d = iso(addDays(startOfUtcDay(addDays(now, -6)), i)).slice(0, 10);
    const revenue = revenueRows.find((r) => r.day === d)?.revenue ?? 0;
    const expenses = expenseRows.find((r) => r.day === d)?.amount ?? 0;
    return { date: d, revenue: Math.round(Number(revenue) * 100) / 100, expenses: Math.round(Number(expenses) * 100) / 100 };
  });

  // Fuel sales distribution (donut)
  const fuelDistribution = db.prepare(
    `SELECT f.name, f.type, SUM(sd.litres) AS litres,
            SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END) AS revenue,
            COUNT(*) AS sales
     FROM sale_details sd
     JOIN sales s ON s.id = sd.sale_id
     JOIN fuels f ON f.id = sd.fuel_id
     WHERE s.sale_date >= ? ${scope.where}
     GROUP BY f.id ORDER BY litres DESC`,
  ).all(monthStart(), ...scope.params) as { name: string; type: string; litres: number; revenue: number; sales: number }[];

  // Pump performance
  const pumpPerformance = db.prepare(
    `SELECT p.id, p.pump_number, p.status, f.name AS fuel_name,
            COUNT(s.id) AS sales,
            COALESCE(SUM(sd.litres), 0) AS litres,
            COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue
     FROM pumps p
     LEFT JOIN sales s ON s.pump_id = p.id AND s.sale_date >= ? ${scope.where}
     LEFT JOIN sale_details sd ON sd.sale_id = s.id
     LEFT JOIN fuels f ON f.id = p.fuel_id
     GROUP BY p.id ORDER BY p.pump_number ASC`,
  ).all(monthStart(), ...scope.params) as Record<string, unknown>[];

  return {
    range,
    salesOverview,
    revenueVsExpenses,
    fuelDistribution: toCamelList(fuelDistribution),
    pumpPerformance: toCamelList(pumpPerformance),
  };
}

function monthStart(): string {
  const now = new Date();
  return iso(startOfUtcDay(new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

export function getRecentTransactions(user: AuthUser, limit = 8) {
  const scope = scopeFor(user);
  const rows = db.prepare(
    `SELECT s.id, s.sale_date, s.total_amount, s.payment_method, s.payment_status,
            p.pump_number, f.name AS fuel_name, sd.litres, e.full_name AS attendant
     FROM sales s
     JOIN sale_details sd ON sd.sale_id = s.id
     JOIN pumps p ON p.id = s.pump_id
     JOIN fuels f ON f.id = sd.fuel_id
     LEFT JOIN employees e ON e.id = s.employee_id
     WHERE 1=1 ${scope.where}
     ORDER BY s.sale_date DESC, s.id DESC LIMIT ?`,
  ).all(...scope.params, limit) as Record<string, unknown>[];

  return toCamelList(rows).map((r) => ({
    ...r,
    stockLevel: null,
  }));
}

export { evaluateStockLevel };
