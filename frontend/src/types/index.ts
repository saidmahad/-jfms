export type Role = 'ADMIN' | 'MANAGER' | 'ATTENDANT';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: Role;
  status: string;
  employeeId: number | null;
  employeeName: string | null;
  position?: string | null;
  permissions?: string[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  settings: {
    stationName: string;
    currency: string;
    timezone: string;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface Fuel {
  id: number;
  name: string;
  type: string;
  pricePerLitre: number;
  currentQuantity: number;
  minimumStock: number;
  maximumCapacity: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  stockLevel?: { status: 'ok' | 'low' | 'critical'; label: string };
}

export interface Pump {
  id: number;
  pumpNumber: string;
  fuelId: number | null;
  fuelName: string | null;
  pricePerLitre?: number | null;
  currentReading: number;
  status: 'active' | 'inactive' | 'maintenance' | 'offline';
  assignedEmployeeId: number | null;
  assignedEmployeeName: string | null;
  location: string | null;
  lastTransactionAt: string | null;
  todaySales: number;
  todayRevenue: number;
}

export interface Sale {
  id: number;
  saleDate: string;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money' | 'rfid' | 'other';
  paymentStatus: 'paid' | 'pending' | 'cancelled';
  employeeId: number | null;
  employeeName: string | null;
  pumpId: number;
  pumpNumber: string;
  fuelId: number;
  fuelName: string;
  litres: number;
  pricePerLitre: number;
  subtotal: number;
  customerId: number | null;
  customerName: string | null;
  vehicleNumber: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: 'active' | 'inactive';
  purchases?: number;
  totalQuantity?: number;
}

export interface Customer {
  id: number;
  fullName: string;
  phone: string | null;
  vehicleNumber: string | null;
  vehicleType: string | null;
  rfidId: string | null;
  totalPurchases?: number;
  totalSpent?: number;
  lastTransaction?: string | null;
}

export interface Employee {
  id: number;
  fullName: string;
  phone: string | null;
  position: string;
  salary: number;
  status: 'active' | 'inactive';
  hireDate: string;
  totalSales?: number;
  totalLitres?: number;
  totalRevenue?: number;
  linkedUsername?: string | null;
}

export interface Expense {
  id: number;
  employeeId: number | null;
  employeeName?: string | null;
  category: 'electricity' | 'salaries' | 'maintenance' | 'transport' | 'supplies' | 'rent' | 'other';
  description: string;
  amount: number;
  paymentMethod: string;
  expenseDate: string;
  notes: string | null;
}

export interface InventoryTransaction {
  id: number;
  fuelId: number;
  fuelName: string;
  supplierId: number | null;
  supplierName: string | null;
  type: 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity: number;
  reference: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  status: 'active' | 'inactive';
  employeeId: number | null;
  employeeName: string | null;
  position?: string | null;
  lastLogin: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  module: string;
  recordId: number | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number | null;
  type: 'low_stock' | 'critical_stock' | 'sale' | 'login' | 'error' | 'admin' | 'system';
  title: string;
  message: string;
  link: string | null;
  isRead: number;
  createdAt: string;
}

export interface DashboardData {
  stationName: string;
  kpis: {
    todaySales: number;
    todayRevenue: number;
    todayExpenses: number;
    netProfit: number;
    revenueChangePercent: number;
    availableFuel: number;
    activePumps: number;
    activeEmployees: number;
    lowStockCount: number;
    monthRevenue: number;
    monthExpenses: number;
  };
  charts: DashboardCharts;
  recentTransactions: Sale[];
  lowStock: Fuel[];
}

export interface DashboardCharts {
  range: 'day' | 'week' | 'month';
  salesOverview: { label: string; revenue: number; litres: number; sales: number }[];
  revenueVsExpenses: { date: string; revenue: number; expenses: number }[];
  fuelDistribution: { name: string; type: string; litres: number; revenue: number; sales: number }[];
  pumpPerformance: { id: number; pumpNumber: string; status: string; fuelName: string | null; sales: number; litres: number; revenue: number }[];
}

export interface ReportMeta {
  stationName: string;
  stationAddress: string;
  currency: string;
  generatedBy: string | null;
  generatedAt: string;
  range: { from: string | null; to: string | null };
}

export interface SalesReport {
  summary: { totalSales: number; totalRevenue: number; totalLitres: number; averageSale: number };
  byDay: { date: string; sales: number; litres: number; revenue: number }[];
  byFuel: { name: string; type: string; sales: number; litres: number; revenue: number }[];
  byPayment: { paymentMethod: string; sales: number; revenue: number }[];
}

export interface RevenueReport {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    totalSales: number;
    totalExpenseCount: number;
  };
  byCategory: { category: string; count: number; amount: number }[];
  byPayment: { paymentMethod: string; count: number; amount: number }[];
}

export interface Settings {
  station_name: string;
  station_address: string;
  station_phone: string;
  station_email: string;
  currency: string;
  timezone: string;
  receipt_footer: string;
  low_stock_threshold: string;
  theme: string;
  notify_low_stock: string;
}
