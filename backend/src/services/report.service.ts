import { db, type SqlValue } from '../db/index.ts';
import { toCamelList } from '../utils/case.ts';

export interface ReportFilters {
  from?: string;
  to?: string;
  employeeId?: number;
  pumpId?: number;
  fuelId?: number;
  paymentMethod?: string;
}

function buildRange(filters: ReportFilters) {
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (filters.from) { where.push('s.sale_date >= ?'); params.push(filters.from); }
  if (filters.to) { where.push('s.sale_date <= ?'); params.push(filters.to); }
  if (filters.employeeId) { where.push('s.employee_id = ?'); params.push(filters.employeeId); }
  if (filters.pumpId) { where.push('s.pump_id = ?'); params.push(filters.pumpId); }
  if (filters.fuelId) { where.push('sd.fuel_id = ?'); params.push(filters.fuelId); }
  if (filters.paymentMethod) { where.push('s.payment_method = ?'); params.push(filters.paymentMethod); }
  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export function salesReport(filters: ReportFilters) {
  const { whereSql, params } = buildRange(filters);

  const summaryRow = db.prepare(
    `SELECT COUNT(*) AS sales,
            COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(sd.litres), 0) AS litres,
            COALESCE(AVG(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount END), 0) AS avg_sale
     FROM sales s JOIN sale_details sd ON sd.sale_id = s.id ${whereSql}`,
  ).get(...params) as { sales: number; revenue: number; litres: number; avg_sale: number };

  const byDay = db.prepare(
    `SELECT substr(s.sale_date, 1, 10) AS date,
            COUNT(*) AS sales,
            COALESCE(SUM(sd.litres), 0) AS litres,
            COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue
     FROM sales s JOIN sale_details sd ON sd.sale_id = s.id ${whereSql}
     GROUP BY date ORDER BY date DESC`,
  ).all(...params) as Record<string, unknown>[];

  const byFuel = db.prepare(
    `SELECT f.name, f.type,
            COUNT(*) AS sales,
            COALESCE(SUM(sd.litres), 0) AS litres,
            COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue
     FROM sales s JOIN sale_details sd ON sd.sale_id = s.id JOIN fuels f ON f.id = sd.fuel_id ${whereSql}
     GROUP BY f.id ORDER BY revenue DESC`,
  ).all(...params) as Record<string, unknown>[];

  const byPayment = db.prepare(
    `SELECT s.payment_method,
            COUNT(*) AS sales,
            COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue
     FROM sales s JOIN sale_details sd ON sd.sale_id = s.id ${whereSql}
     GROUP BY s.payment_method ORDER BY revenue DESC`,
  ).all(...params) as Record<string, unknown>[];

  return {
    summary: {
      totalSales: Number(summaryRow.sales),
      totalRevenue: Math.round(Number(summaryRow.revenue) * 100) / 100,
      totalLitres: Math.round(Number(summaryRow.litres) * 100) / 100,
      averageSale: Math.round(Number(summaryRow.avg_sale) * 100) / 100,
    },
    byDay: toCamelList(byDay),
    byFuel: toCamelList(byFuel),
    byPayment: toCamelList(byPayment),
  };
}

export function inventoryReport(filters: { from?: string; to?: string }) {
  const range = filters.from || filters.to
    ? `WHERE it.created_at >= COALESCE(?, '1900-01-01') AND it.created_at <= COALESCE(?, '9999-12-31')`
    : '';
  const rangeParams = [filters.from ?? null, filters.to ?? null];

  const movements = db.prepare(
    `SELECT it.type, COALESCE(SUM(it.quantity), 0) AS quantity, COUNT(*) AS count
     FROM inventory_transactions it ${range} GROUP BY it.type`,
  ).all(...(range ? rangeParams : [])) as { type: string; quantity: number; count: number }[];

  const purchased = movements.find((m) => m.type === 'purchase')?.quantity ?? 0;
  const sold = movements.filter((m) => m.type === 'sale').reduce((a, m) => a + Math.abs(m.quantity), 0);
  const adjusted = movements.filter((m) => m.type === 'adjustment' || m.type === 'return').reduce((a, m) => a + m.quantity, 0);

  const perFuel = db.prepare(
    `SELECT f.id, f.name, f.type, f.current_quantity, f.minimum_stock, f.maximum_capacity, f.status,
            COALESCE((
              SELECT SUM(it.quantity) FROM inventory_transactions it
              WHERE it.fuel_id = f.id AND it.type = 'purchase' ${range ? 'AND it.created_at >= COALESCE(?, \'1900-01-01\') AND it.created_at <= COALESCE(?, \'9999-12-31\')' : ''}
            ), 0) AS purchased,
            COALESCE((
              SELECT SUM(ABS(it.quantity)) FROM inventory_transactions it
              WHERE it.fuel_id = f.id AND it.type = 'sale' ${range ? 'AND it.created_at >= COALESCE(?, \'1900-01-01\') AND it.created_at <= COALESCE(?, \'9999-12-31\')' : ''}
            ), 0) AS sold
     FROM fuels f ORDER BY f.name ASC`,
  ).all(...(range ? [...rangeParams, ...rangeParams] : [])) as Record<string, unknown>[];

  const lowStock = db.prepare(
    `SELECT id, name, current_quantity, minimum_stock FROM fuels WHERE current_quantity <= minimum_stock`,
  ).all() as Record<string, unknown>[];

  return {
    summary: {
      purchased: Math.round(Number(purchased) * 100) / 100,
      sold: Math.round(Number(sold) * 100) / 100,
      adjusted: Math.round(Number(adjusted) * 100) / 100,
      lowStockCount: lowStock.length,
    },
    perFuel: toCamelList(perFuel),
    lowStock: toCamelList(lowStock),
  };
}

export function revenueReport(filters: { from?: string; to?: string }) {
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (filters.from) { where.push('sale_date >= ?'); params.push(filters.from); }
  if (filters.to) { where.push('sale_date <= ?'); params.push(filters.to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const revenueRow = db.prepare(
    `SELECT COUNT(*) AS sales,
            COALESCE(SUM(CASE WHEN payment_status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue
     FROM sales ${whereSql}`,
  ).get(...params) as { sales: number; revenue: number };

  const expenseRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS expenses, COUNT(*) AS count FROM expenses ${whereSql}`,
  ).get(...params) as { expenses: number; count: number };

  const revenue = Number(revenueRow.revenue);
  const expenses = Number(expenseRow.expenses);

  const byCategory = db.prepare(
    `SELECT category, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM expenses ${whereSql}
     GROUP BY category ORDER BY amount DESC`,
  ).all(...params) as Record<string, unknown>[];

  const byPayment = db.prepare(
    `SELECT payment_method, COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN payment_status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS amount
     FROM sales ${whereSql} GROUP BY payment_method ORDER BY amount DESC`,
  ).all(...params) as Record<string, unknown>[];

  return {
    summary: {
      totalRevenue: Math.round(revenue * 100) / 100,
      totalExpenses: Math.round(expenses * 100) / 100,
      grossProfit: Math.round(revenue * 100) / 100,
      netProfit: Math.round((revenue - expenses) * 100) / 100,
      totalSales: Number(revenueRow.sales),
      totalExpenseCount: Number(expenseRow.count),
    },
    byCategory: toCamelList(byCategory),
    byPayment: toCamelList(byPayment),
  };
}

export function employeeReport(filters: { from?: string; to?: string }) {
  const range = filters.from || filters.to
    ? `AND s.sale_date >= COALESCE(?, '1900-01-01') AND s.sale_date <= COALESCE(?, '9999-12-31')`
    : '';
  const params: SqlValue[] = [filters.from ?? null, filters.to ?? null];

  const rows = db.prepare(
    `SELECT e.id, e.full_name, e.phone, e.position, e.salary, e.status, e.hire_date,
            COUNT(s.id) AS sales,
            COALESCE(SUM(sd.litres), 0) AS litres,
            COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue
     FROM employees e
     LEFT JOIN sales s ON s.employee_id = e.id ${range}
     LEFT JOIN sale_details sd ON sd.sale_id = s.id
     GROUP BY e.id ORDER BY revenue DESC`,
  ).all(...(range ? params : [])) as Record<string, unknown>[];

  return { employees: toCamelList(rows) };
}

export function pumpReport(filters: { from?: string; to?: string }) {
  const range = filters.from || filters.to
    ? `AND s.sale_date >= COALESCE(?, '1900-01-01') AND s.sale_date <= COALESCE(?, '9999-12-31')`
    : '';
  const params: SqlValue[] = [filters.from ?? null, filters.to ?? null];

  const rows = db.prepare(
    `SELECT p.id, p.pump_number, p.location, p.status, p.current_reading,
            f.name AS fuel_name,
            COUNT(s.id) AS sales,
            COALESCE(SUM(sd.litres), 0) AS litres,
            COALESCE(SUM(CASE WHEN s.payment_status <> 'cancelled' THEN s.total_amount ELSE 0 END), 0) AS revenue
     FROM pumps p
     LEFT JOIN fuels f ON f.id = p.fuel_id
     LEFT JOIN sales s ON s.pump_id = p.id ${range}
     LEFT JOIN sale_details sd ON sd.sale_id = s.id
     GROUP BY p.id ORDER BY p.pump_number ASC`,
  ).all(...(range ? params : [])) as Record<string, unknown>[];

  return { pumps: toCamelList(rows) };
}
