import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, Printer, Fuel, Droplets, Wallet, Users as UsersIcon, Gauge } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api, { errorMessage } from '../lib/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Select } from '../components/ui/Select.tsx';
import { StatCard } from '../components/ui/StatCard.tsx';
import { TableSkeleton } from '../components/ui/Skeleton.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { cn } from '../lib/utils.ts';
import { formatCurrency, formatDate, formatLitres, titleCase } from '../lib/format.ts';
import type { ReportMeta, SalesReport, RevenueReport } from '../types/index.ts';

type Tab = 'sales' | 'inventory' | 'revenue' | 'employees' | 'pumps';

interface ReportPayload<T> {
  report: T;
  meta: ReportMeta;
}

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'sales', label: 'Sales Report', icon: BarChart3 },
  { key: 'inventory', label: 'Inventory Report', icon: Droplets },
  { key: 'revenue', label: 'Revenue Report', icon: Wallet },
  { key: 'employees', label: 'Employee Report', icon: UsersIcon },
  { key: 'pumps', label: 'Pump Report', icon: Gauge },
];

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [pumpId, setPumpId] = useState('');
  const [fuelId, setFuelId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (from) p.from = `${from}T00:00:00.000Z`;
    if (to) p.to = `${to}T23:59:59.999Z`;
    if (employeeId) p.employeeId = employeeId;
    if (pumpId) p.pumpId = pumpId;
    if (fuelId) p.fuelId = fuelId;
    if (paymentMethod) p.paymentMethod = paymentMethod;
    return p;
  }, [from, to, employeeId, pumpId, fuelId, paymentMethod]);

  const salesQuery = useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: async () => (await api.get<{ data: ReportPayload<SalesReport> }>('/reports/sales', { params })).data.data,
    enabled: tab === 'sales',
  });

  const inventoryQuery = useQuery({
    queryKey: ['reports', 'inventory', { from, to }],
    queryFn: async () => (await api.get<{ data: ReportPayload<unknown> }>('/reports/inventory', { params: { from: params.from, to: params.to } })).data.data,
    enabled: tab === 'inventory',
  });

  const revenueQuery = useQuery({
    queryKey: ['reports', 'revenue', { from, to }],
    queryFn: async () => (await api.get<{ data: ReportPayload<RevenueReport> }>('/reports/revenue', { params: { from: params.from, to: params.to } })).data.data,
    enabled: tab === 'revenue',
  });

  const employeesQuery = useQuery({
    queryKey: ['reports', 'employees', { from, to }],
    queryFn: async () => (await api.get<{ data: ReportPayload<{ employees: unknown[] }> }>('/reports/employees', { params: { from: params.from, to: params.to } })).data.data,
    enabled: tab === 'employees',
  });

  const pumpsQuery = useQuery({
    queryKey: ['reports', 'pumps', { from, to }],
    queryFn: async () => (await api.get<{ data: ReportPayload<{ pumps: unknown[] }> }>('/reports/pumps', { params: { from: params.from, to: params.to } })).data.data,
    enabled: tab === 'pumps',
  });

  const lookupQuery = useQuery({
    queryKey: ['reports', 'lookups'],
    queryFn: async () => {
      const [fuels, pumps, employees] = await Promise.all([
        api.get<{ data: { items: { id: number; name: string }[] } }>('/fuels', { params: { perPage: 100 } }),
        api.get<{ data: { id: number; pumpNumber: string }[] }>('/pumps'),
        api.get<{ data: { id: number; fullName: string }[] }>('/employees'),
      ]);
      return { fuels: fuels.data.data.items, pumps: pumps.data.data, employees: employees.data.data };
    },
  });

  const active = tab === 'sales' ? salesQuery : tab === 'inventory' ? inventoryQuery : tab === 'revenue' ? revenueQuery : tab === 'employees' ? employeesQuery : pumpsQuery;
  const meta = active.data?.meta;
  const station = meta?.stationName ?? 'JUPA Fuel Station';
  const currency = meta?.currency ?? 'USD';

  const rangeLabel = meta?.range?.from || meta?.range?.to ? `${meta.range.from ? formatDate(meta.range.from) : 'Start'} → ${meta.range.to ? formatDate(meta.range.to) : 'Today'}` : 'All time';

  const exportCSV = () => {
    if (tab === 'sales' && salesQuery.data) {
      const r = salesQuery.data.report;
      downloadCSV('sales-report.csv',
        ['Date', 'Sales', 'Litres', 'Revenue'],
        r.byDay.map((d) => [d.date, d.sales, d.litres, d.revenue]));
    } else if (tab === 'inventory' && inventoryQuery.data) {
      const r = inventoryQuery.data.report as { perFuel: { name: string; purchased: number; sold: number; currentQuantity: number; minimumStock: number }[] };
      downloadCSV('inventory-report.csv', ['Fuel', 'Purchased (L)', 'Sold (L)', 'Current (L)', 'Minimum (L)'], r.perFuel.map((f) => [f.name, f.purchased, f.sold, f.currentQuantity, f.minimumStock]));
    } else if (tab === 'revenue' && revenueQuery.data) {
      const r = revenueQuery.data.report;
      downloadCSV('revenue-report.csv', ['Category', 'Count', 'Amount'], r.byCategory.map((c) => [titleCase(c.category), c.count, c.amount]));
    } else if (tab === 'employees' && employeesQuery.data) {
      const r = employeesQuery.data.report as { employees: { fullName: string; position: string; sales: number; litres: number; revenue: number }[] };
      downloadCSV('employee-report.csv', ['Employee', 'Position', 'Sales', 'Litres', 'Revenue'], r.employees.map((e) => [e.fullName, e.position, e.sales, e.litres, e.revenue]));
    } else if (tab === 'pumps' && pumpsQuery.data) {
      const r = pumpsQuery.data.report as { pumps: { pumpNumber: string; fuelName: string | null; sales: number; litres: number; revenue: number; status: string }[] };
      downloadCSV('pump-report.csv', ['Pump', 'Fuel', 'Sales', 'Litres', 'Revenue', 'Status'], r.pumps.map((p) => [p.pumpNumber, p.fuelName ?? '', p.sales, p.litres, p.revenue, p.status]));
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports Center"
        description="Operational and financial reports with JUPA branding"
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </>
        }
      />

      {/* Tabs + filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                tab === t.key ? 'bg-petrol-800 text-white shadow-sm' : 'bg-white text-petrol-500 hover:text-petrol-800 dark:bg-petrol-900 dark:text-slate-300 dark:hover:text-white',
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} label="From" className="w-36 text-xs" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} label="To" className="w-36 text-xs" />
        </div>
      </div>

      {tab === 'sales' && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="All employees" options={(lookupQuery.data?.employees ?? []).map((e) => ({ value: e.id, label: e.fullName }))} />
          <Select value={pumpId} onChange={(e) => setPumpId(e.target.value)} placeholder="All pumps" options={(lookupQuery.data?.pumps ?? []).map((p) => ({ value: p.id, label: p.pumpNumber }))} />
          <Select value={fuelId} onChange={(e) => setFuelId(e.target.value)} placeholder="All fuels" options={(lookupQuery.data?.fuels ?? []).map((f) => ({ value: f.id, label: f.name }))} />
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="All payments" options={[{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'mobile_money', label: 'Mobile Money' }, { value: 'rfid', label: 'RFID' }, { value: 'other', label: 'Other' }]} />
        </div>
      )}

      <div className="report-print-area">
        {/* Report header */}
        <div className="mb-6 hidden rounded-2xl border border-petrol-100 dark:border-petrol-800 bg-white p-5 dark:bg-petrol-900 print:block">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-extrabold text-petrol-900 dark:text-white">{station}</p>
              <p className="text-xs text-petrol-400">{meta?.stationAddress}</p>
            </div>
            <div className="text-right text-xs text-petrol-500 dark:text-petrol-400">
              <p className="font-bold uppercase text-petrol-900 dark:text-white">{TABS.find((t) => t.key === tab)?.label}</p>
              <p>Period: {rangeLabel}</p>
              <p>Generated: {meta ? formatDate(meta.generatedAt) : '—'} by {meta?.generatedBy ?? user?.username}</p>
            </div>
          </div>
        </div>

        {active.isLoading ? (
          <TableSkeleton rows={10} />
        ) : active.isError ? (
          <ErrorState message={errorMessage(active.error)} onRetry={() => active.refetch()} />
        ) : tab === 'sales' && salesQuery.data ? (
          <SalesReportView data={salesQuery.data} currency={currency} />
        ) : tab === 'inventory' && inventoryQuery.data ? (
          <InventoryReportView data={inventoryQuery.data} />
        ) : tab === 'revenue' && revenueQuery.data ? (
          <RevenueReportView data={revenueQuery.data} currency={currency} />
        ) : tab === 'employees' && employeesQuery.data ? (
          <EmployeeReportView data={employeesQuery.data} currency={currency} />
        ) : tab === 'pumps' && pumpsQuery.data ? (
          <PumpReportView data={pumpsQuery.data} currency={currency} />
        ) : null}
      </div>
    </div>
  );
}

function SalesReportView({ data, currency }: { data: ReportPayload<SalesReport>; currency: string }) {
  const s = data.report.summary;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 print:grid-cols-4">
        <StatCard label="Total Sales" value={s.totalSales.toLocaleString()} icon={<BarChart3 className="h-5 w-5" />} description="transactions" />
        <StatCard label="Total Revenue" value={formatCurrency(s.totalRevenue, currency)} icon={<Wallet className="h-5 w-5" />} iconClass="bg-success/10 text-success" description="gross revenue" />
        <StatCard label="Total Litres" value={formatLitres(s.totalLitres)} icon={<Fuel className="h-5 w-5" />} iconClass="bg-energy-500/10 text-energy-600" description="dispensed" />
        <StatCard label="Average Sale" value={formatCurrency(s.averageSale, currency)} icon={<Gauge className="h-5 w-5" />} description="per transaction" />
      </div>

      <Card>
        <CardHeader title="Sales Trend" subtitle="Daily sales in the selected period" />
        <CardBody>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.report.byDay} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-petrol-100 dark:text-petrol-800" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8aa0b5' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8aa0b5' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} contentStyle={{ borderRadius: 12, border: '1px solid rgba(120,130,140,0.2)', fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#FF7A00" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By Fuel" />
          <CardBody className="p-0">
            <table className="w-full">
              <thead><tr className="border-b border-petrol-100 dark:border-petrol-800"><th className="table-head px-5 py-2.5 text-left">Fuel</th><th className="table-head px-4 py-2.5 text-right">Sales</th><th className="table-head px-4 py-2.5 text-right">Litres</th><th className="table-head px-4 py-2.5 text-right">Revenue</th></tr></thead>
              <tbody>
                {data.report.byFuel.map((f) => (
                  <tr key={f.name} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0">
                    <td className="px-5 py-2.5 text-sm font-semibold">{f.name}</td>
                    <td className="px-4 py-2.5 text-sm text-right">{f.sales}</td>
                    <td className="px-4 py-2.5 text-sm text-right">{formatLitres(f.litres)}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-semibold">{formatCurrency(f.revenue, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="By Payment Method" />
          <CardBody className="p-0">
            <table className="w-full">
              <thead><tr className="border-b border-petrol-100 dark:border-petrol-800"><th className="table-head px-5 py-2.5 text-left">Method</th><th className="table-head px-4 py-2.5 text-right">Sales</th><th className="table-head px-4 py-2.5 text-right">Revenue</th></tr></thead>
              <tbody>
                {data.report.byPayment.map((p) => (
                  <tr key={p.paymentMethod} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0">
                    <td className="px-5 py-2.5 text-sm capitalize">{p.paymentMethod.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 text-sm text-right">{p.sales}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-semibold">{formatCurrency(p.revenue, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function InventoryReportView({ data }: { data: ReportPayload<unknown> }) {
  const r = data.report as {
    summary: { purchased: number; sold: number; adjusted: number; lowStockCount: number };
    perFuel: { name: string; purchased: number; sold: number; currentQuantity: number; minimumStock: number; status: string }[];
    lowStock: { name: string; currentQuantity: number; minimumStock: number }[];
  };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 print:grid-cols-4">
        <StatCard label="Purchased" value={formatLitres(r.summary.purchased)} icon={<Droplets className="h-5 w-5" />} iconClass="bg-success/10 text-success" description="in period" />
        <StatCard label="Sold" value={formatLitres(r.summary.sold)} icon={<Fuel className="h-5 w-5" />} iconClass="bg-energy-500/10 text-energy-600" description="in period" />
        <StatCard label="Adjusted" value={formatLitres(r.summary.adjusted)} icon={<Gauge className="h-5 w-5" />} description="net adjustments" />
        <StatCard label="Low Stock" value={r.summary.lowStockCount.toLocaleString()} icon={<BarChart3 className="h-5 w-5" />} iconClass={r.summary.lowStockCount > 0 ? 'bg-amber-500/15 text-amber-500' : 'bg-petrol-500/10'} description="fuels below minimum" />
      </div>

      <Card>
        <CardHeader title="Stock Per Fuel" subtitle="Purchased and sold volumes vs current level" />
        <CardBody className="p-0">
          <table className="w-full">
            <thead><tr className="border-b border-petrol-100 dark:border-petrol-800"><th className="table-head px-5 py-2.5 text-left">Fuel</th><th className="table-head px-4 py-2.5 text-right">Purchased</th><th className="table-head px-4 py-2.5 text-right">Sold</th><th className="table-head px-4 py-2.5 text-right">Current</th><th className="table-head px-4 py-2.5 text-right">Minimum</th></tr></thead>
            <tbody>
              {r.perFuel.map((f) => (
                <tr key={f.name} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0">
                  <td className="px-5 py-2.5 text-sm font-semibold">{f.name}</td>
                  <td className="px-4 py-2.5 text-sm text-right text-success">{formatLitres(f.purchased)}</td>
                  <td className="px-4 py-2.5 text-sm text-right">{formatLitres(f.sold)}</td>
                  <td className="px-4 py-2.5 text-sm text-right font-semibold">{formatLitres(f.currentQuantity)}</td>
                  <td className="px-4 py-2.5 text-sm text-right text-petrol-400">{formatLitres(f.minimumStock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function RevenueReportView({ data, currency }: { data: ReportPayload<RevenueReport>; currency: string }) {
  const s = data.report.summary;
  const COLORS = ['#FF7A00', '#0B3954', '#FFC107', '#16A34A', '#8a5cf6', '#dc2626', '#0ea5e9'];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 print:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(s.totalRevenue, currency)} icon={<Wallet className="h-5 w-5" />} iconClass="bg-success/10 text-success" description={`${s.totalSales} sales`} />
        <StatCard label="Total Expenses" value={formatCurrency(s.totalExpenses, currency)} icon={<BarChart3 className="h-5 w-5" />} iconClass="bg-danger/10 text-danger" description={`${s.totalExpenseCount} expenses`} />
        <StatCard label="Gross Profit" value={formatCurrency(s.grossProfit, currency)} icon={<Fuel className="h-5 w-5" />} description="total revenue" />
        <StatCard label="Net Profit" value={formatCurrency(s.netProfit, currency)} icon={<Gauge className="h-5 w-5" />} iconClass={s.netProfit >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'} description="revenue − expenses" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Expenses by Category" />
          <CardBody>
            {data.report.byCategory.length === 0 ? (
              <p className="py-10 text-center text-sm text-petrol-400">No expenses in this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.report.byCategory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-petrol-100 dark:text-petrol-800" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#8aa0b5' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8aa0b5' }} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => formatCurrency(v, currency).replace('.00', '')} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} contentStyle={{ borderRadius: 12, border: '1px solid rgba(120,130,140,0.2)', fontSize: 12 }} />
                  <Bar dataKey="amount" fill="#FF7A00" radius={[4, 4, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Revenue by Payment Method" />
          <CardBody>
            {data.report.byPayment.length === 0 ? (
              <p className="py-10 text-center text-sm text-petrol-400">No sales in this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.report.byPayment} dataKey="amount" nameKey="paymentMethod" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                    {data.report.byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [formatCurrency(Number(v), currency), String(name).replace('_', ' ')]} contentStyle={{ borderRadius: 12, border: '1px solid rgba(120,130,140,0.2)', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Expense Breakdown" />
        <CardBody className="p-0">
          <table className="w-full">
            <thead><tr className="border-b border-petrol-100 dark:border-petrol-800"><th className="table-head px-5 py-2.5 text-left">Category</th><th className="table-head px-4 py-2.5 text-right">Count</th><th className="table-head px-4 py-2.5 text-right">Amount</th></tr></thead>
            <tbody>
              {data.report.byCategory.map((c) => (
                <tr key={c.category} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0">
                  <td className="px-5 py-2.5 text-sm font-medium capitalize">{titleCase(c.category)}</td>
                  <td className="px-4 py-2.5 text-sm text-right">{c.count}</td>
                  <td className="px-4 py-2.5 text-sm text-right font-semibold text-danger">{formatCurrency(c.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function EmployeeReportView({ data, currency }: { data: ReportPayload<unknown>; currency: string }) {
  const r = data.report as { employees: { id: number; fullName: string; position: string; status: string; salary: number; sales: number; litres: number; revenue: number }[] };
  return (
    <Card>
      <CardHeader title="Employee Performance" subtitle="Sales volume and revenue per employee" />
      <CardBody className="p-0">
        <table className="w-full">
          <thead><tr className="border-b border-petrol-100 dark:border-petrol-800"><th className="table-head px-5 py-2.5 text-left">Employee</th><th className="table-head px-4 py-2.5 text-left">Position</th><th className="table-head px-4 py-2.5 text-left">Status</th><th className="table-head px-4 py-2.5 text-right">Salary</th><th className="table-head px-4 py-2.5 text-right">Sales</th><th className="table-head px-4 py-2.5 text-right">Litres</th><th className="table-head px-4 py-2.5 text-right">Revenue</th></tr></thead>
          <tbody>
            {r.employees.map((e) => (
              <tr key={e.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0">
                <td className="px-5 py-2.5 text-sm font-semibold">{e.fullName}</td>
                <td className="px-4 py-2.5 text-sm">{e.position}</td>
                <td className="px-4 py-2.5 text-sm capitalize">{e.status}</td>
                <td className="px-4 py-2.5 text-sm text-right">{formatCurrency(e.salary, currency)}</td>
                <td className="px-4 py-2.5 text-sm text-right">{e.sales}</td>
                <td className="px-4 py-2.5 text-sm text-right">{formatLitres(e.litres)}</td>
                <td className="px-4 py-2.5 text-sm text-right font-semibold">{formatCurrency(e.revenue, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

function PumpReportView({ data, currency }: { data: ReportPayload<unknown>; currency: string }) {
  const r = data.report as { pumps: { id: number; pumpNumber: string; fuelName: string | null; status: string; currentReading: number; sales: number; litres: number; revenue: number }[] };
  return (
    <Card>
      <CardHeader title="Pump Performance" subtitle="Sales, litres and revenue per pump" />
      <CardBody className="p-0">
        <table className="w-full">
          <thead><tr className="border-b border-petrol-100 dark:border-petrol-800"><th className="table-head px-5 py-2.5 text-left">Pump</th><th className="table-head px-4 py-2.5 text-left">Fuel</th><th className="table-head px-4 py-2.5 text-left">Status</th><th className="table-head px-4 py-2.5 text-right">Reading</th><th className="table-head px-4 py-2.5 text-right">Sales</th><th className="table-head px-4 py-2.5 text-right">Litres</th><th className="table-head px-4 py-2.5 text-right">Revenue</th></tr></thead>
          <tbody>
            {r.pumps.map((p) => (
              <tr key={p.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0">
                <td className="px-5 py-2.5 text-sm font-semibold">{p.pumpNumber}</td>
                <td className="px-4 py-2.5 text-sm">{p.fuelName ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm capitalize">{p.status}</td>
                <td className="px-4 py-2.5 text-sm text-right">{formatLitres(p.currentReading)}</td>
                <td className="px-4 py-2.5 text-sm text-right">{p.sales}</td>
                <td className="px-4 py-2.5 text-sm text-right">{formatLitres(p.litres)}</td>
                <td className="px-4 py-2.5 text-sm text-right font-semibold">{formatCurrency(p.revenue, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
