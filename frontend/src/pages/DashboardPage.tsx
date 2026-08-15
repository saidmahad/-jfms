import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  DollarSign,
  Wallet,
  TrendingUp,
  Droplets,
  Gauge,
  Users,
  AlertTriangle,
  Fuel,
  Plus,
  ArrowRight,
  Clock,
} from 'lucide-react';
import api, { errorMessage } from '../lib/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { StatCard } from '../components/ui/StatCard.tsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge, statusTone } from '../components/ui/Badge.tsx';
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from '../components/ui/Skeleton.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { ChartCard } from '../components/charts/ChartCard.tsx';
import { SalesLineChart } from '../components/charts/SalesLineChart.tsx';
import { RevenueExpenseBar } from '../components/charts/RevenueExpenseBar.tsx';
import { FuelDonut } from '../components/charts/FuelDonut.tsx';
import { PumpBarChart } from '../components/charts/PumpBarChart.tsx';
import { cn } from '../lib/utils.ts';
import { formatCurrency, formatDate, formatLitres, formatTime } from '../lib/format.ts';
import type { DashboardCharts, DashboardData, Fuel as FuelType, Sale } from '../types/index.ts';

type Range = 'day' | 'week' | 'month';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>('week');

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardData }>('/dashboard');
      return res.data.data;
    },
  });

  const fuelsQuery = useQuery({
    queryKey: ['fuels', { all: true }],
    queryFn: async () => {
      const res = await api.get<{ data: { items: FuelType[] } }>('/fuels', { params: { perPage: 100 } });
      return res.data.data.items;
    },
  });

  const chartsQuery = useQuery({
    queryKey: ['dashboard-charts', range],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardCharts }>('/dashboard/charts', { params: { range } });
      return res.data.data;
    },
  });

  const data = dashboardQuery.data;
  const charts = chartsQuery.data;

  const fuelLevels = useMemo(() => {
    if (!fuelsQuery.data) return [];
    return fuelsQuery.data
      .filter((f) => f.status === 'active')
      .map((f) => ({
        ...f,
        pct: f.maximumCapacity > 0 ? Math.min(100, Math.round((f.currentQuantity / f.maximumCapacity) * 100)) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [fuelsQuery.data]);

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (dashboardQuery.isError || !data) {
    return <ErrorState message={errorMessage(dashboardQuery.error)} onRetry={() => dashboardQuery.refetch()} />;
  }

  const k = data.kpis;
  const stationStatus = k.lowStockCount > 0 ? 'Attention Needed' : 'All Systems Operational';
  const statusColor = k.lowStockCount > 0 ? 'bg-amber-500' : 'bg-success';

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-petroleum-gradient p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-energy-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
              {greeting()}, {user?.employeeName?.split(' ')[0] ?? user?.username}
            </h1>
            <p className="mt-1 text-sm text-petrol-200">
              {formatDate(new Date())} · Fuel Station Control Center
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className={cn('h-2.5 w-2.5 rounded-full', statusColor, statusColor === 'bg-amber-500' && 'animate-pulse-soft')} />
              <span className="font-medium">{stationStatus}</span>
              {k.lowStockCount > 0 && (
                <span className="text-petrol-300">· {k.lowStockCount} low stock alert{k.lowStockCount === 1 ? '' : 's'}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/sales/new')}
              className="bg-energy-gradient border-0 hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New Sale
            </Button>
            <Link
              to="/reports"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
            >
              View Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={k.todaySales.toLocaleString()}
          icon={<ShoppingCart className="h-5 w-5" />}
          description="transactions today"
        />
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(k.todayRevenue)}
          change={k.revenueChangePercent}
          changeLabel="vs yesterday"
          icon={<DollarSign className="h-5 w-5" />}
          iconClass="bg-success/10 text-success"
          accent
        />
        <StatCard
          label="Today's Expenses"
          value={formatCurrency(k.todayExpenses)}
          icon={<Wallet className="h-5 w-5" />}
          iconClass="bg-danger/10 text-danger"
          description="spent today"
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(k.netProfit)}
          icon={<TrendingUp className="h-5 w-5" />}
          iconClass="bg-petrol-500/10 text-petrol-600 dark:text-petrol-300"
          description="revenue − expenses"
        />
        <StatCard
          label="Available Fuel"
          value={formatLitres(k.availableFuel)}
          icon={<Droplets className="h-5 w-5" />}
          iconClass="bg-energy-500/10 text-energy-600"
          description="across active fuels"
        />
        <StatCard
          label="Active Pumps"
          value={k.activePumps.toLocaleString()}
          icon={<Gauge className="h-5 w-5" />}
          description="dispensing now"
        />
        <StatCard
          label="Employees"
          value={k.activeEmployees.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          description="active on shift"
        />
        <StatCard
          label="Low Stock Alerts"
          value={k.lowStockCount.toLocaleString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClass={k.lowStockCount > 0 ? 'bg-amber-500/15 text-amber-500' : 'bg-petrol-500/10 text-petrol-500'}
          description={k.lowStockCount > 0 ? 'requires attention' : 'all healthy'}
        />
      </div>

      {/* Month summary strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-petrol-400">Month Revenue</p>
          <p className="mt-1 font-display text-xl font-extrabold text-petrol-900 dark:text-white">{formatCurrency(k.monthRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-petrol-400">Month Expenses</p>
          <p className="mt-1 font-display text-xl font-extrabold text-petrol-900 dark:text-white">{formatCurrency(k.monthExpenses)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-petrol-400">Month Net</p>
          <p className="mt-1 font-display text-xl font-extrabold text-petrol-900 dark:text-white">
            {formatCurrency(k.monthRevenue - k.monthExpenses)}
          </p>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Sales Overview"
          subtitle={range === 'day' ? 'Hourly revenue today' : range === 'week' ? 'Daily revenue, last 7 days' : 'Daily revenue, last 30 days'}
          className="lg:col-span-2"
          actions={
            <div className="flex rounded-lg border border-petrol-200 dark:border-petrol-700 p-0.5">
              {(['day', 'week', 'month'] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors',
                    range === r ? 'bg-energy-500 text-white' : 'text-petrol-500 hover:text-petrol-800 dark:hover:text-slate-200',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          }
        >
          {chartsQuery.isLoading ? (
            <div className="skeleton h-[260px] w-full" />
          ) : (
            <SalesLineChart data={charts?.salesOverview ?? []} />
          )}
        </ChartCard>

        <ChartCard title="Fuel Sales Distribution" subtitle="By litres sold this month">
          {chartsQuery.isLoading ? <div className="skeleton h-[260px] w-full" /> : <FuelDonut data={charts?.fuelDistribution ?? []} />}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Revenue vs Expenses" subtitle="Last 7 days" className="lg:col-span-2">
          {chartsQuery.isLoading ? (
            <div className="skeleton h-[260px] w-full" />
          ) : (
            <RevenueExpenseBar data={charts?.revenueVsExpenses ?? []} />
          )}
        </ChartCard>
        <ChartCard title="Pump Performance" subtitle="Revenue by pump this month">
          {chartsQuery.isLoading ? <div className="skeleton h-[260px] w-full" /> : <PumpBarChart data={charts?.pumpPerformance ?? []} />}
        </ChartCard>
      </div>

      {/* Fuel tank levels + low stock */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Fuel Tank Levels" subtitle="Live stock vs maximum capacity" />
          <CardBody>
            {fuelLevels.length === 0 ? (
              <EmptyState title="No active fuels" description="Add fuels in Fuel Management to see tank levels." />
            ) : (
              <div className="space-y-5">
                {fuelLevels.map((f) => (
                  <div key={f.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold text-petrol-800 dark:text-slate-100">
                        <Fuel className="h-4 w-4 text-energy-500" />
                        {f.name}
                        <span className="text-xs font-normal capitalize text-petrol-400">{f.type}</span>
                      </span>
                      <span className="text-xs text-petrol-500 dark:text-petrol-400">
                        {formatLitres(f.currentQuantity)} of {formatLitres(f.maximumCapacity)} · {f.pct}%
                      </span>
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-petrol-100 dark:bg-petrol-800">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          f.stockLevel?.status === 'critical'
                            ? 'bg-danger'
                            : f.stockLevel?.status === 'low'
                              ? 'bg-fuel-400'
                              : 'bg-energy-gradient',
                        )}
                        style={{ width: `${Math.max(f.pct, 2)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-petrol-400">
                      <span>Min: {formatLitres(f.minimumStock)}</span>
                      {f.stockLevel?.status !== 'ok' && (
                        <Badge tone={statusTone(f.stockLevel?.status ?? '')}>{f.stockLevel?.label}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Low Stock Panel"
            subtitle="Fuels at or below minimum level"
            actions={
              <Link to="/inventory" className="text-xs font-semibold text-energy-600 hover:underline">
                Manage →
              </Link>
            }
          />
          <CardBody className="p-0">
            {data.lowStock.length === 0 ? (
              <EmptyState
                icon={<Fuel className="h-7 w-7" />}
                title="All stock healthy"
                description="No fuels are at or below their minimum stock level."
              />
            ) : (
              <ul className="divide-y divide-petrol-100 dark:divide-petrol-800">
                {data.lowStock.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', f.stockLevel?.status === 'critical' ? 'bg-danger/10 text-danger' : 'bg-amber-500/10 text-amber-500')}>
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-petrol-800 dark:text-slate-100">{f.name}</p>
                      <p className="text-xs text-petrol-400">
                        {formatLitres(f.currentQuantity)} · min {formatLitres(f.minimumStock)}
                      </p>
                    </div>
                    <Badge tone={statusTone(f.stockLevel?.status ?? '')}>{f.stockLevel?.label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader
          title="Recent Transactions"
          subtitle="Latest sales across the station"
          actions={
            <Link to="/sales" className="text-xs font-semibold text-energy-600 hover:underline">
              View all →
            </Link>
          }
        />
        <div className="overflow-x-auto">
          {data.recentTransactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Sales will appear here as soon as the first transaction is completed."
              action={
                <Button size="sm" onClick={() => navigate('/sales/new')}>
                  <Plus className="h-4 w-4" /> Record a sale
                </Button>
              }
            />
          ) : (
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-petrol-100 dark:border-petrol-800">
                  <th className="table-head px-5 py-3 text-left">Sale ID</th>
                  <th className="table-head px-4 py-3 text-left">Pump</th>
                  <th className="table-head px-4 py-3 text-left">Fuel</th>
                  <th className="table-head px-4 py-3 text-right">Litres</th>
                  <th className="table-head px-4 py-3 text-right">Amount</th>
                  <th className="table-head px-4 py-3 text-left">Attendant</th>
                  <th className="table-head px-4 py-3 text-left">Payment</th>
                  <th className="table-head px-4 py-3 text-left">Time</th>
                  <th className="table-head px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((s: Sale) => (
                  <tr key={s.id} className="border-b border-petrol-50 dark:border-petrol-800/60 last:border-0 hover:bg-petrol-50/60 dark:hover:bg-petrol-800/40">
                    <td className="table-cell px-5">
                      <Link to={`/sales/${s.id}`} className="font-semibold text-energy-600 hover:underline">#{s.id}</Link>
                    </td>
                    <td className="table-cell text-petrol-600 dark:text-slate-300">{s.pumpNumber}</td>
                    <td className="table-cell">{s.fuelName}</td>
                    <td className="table-cell text-right">{formatLitres(s.litres)}</td>
                    <td className="table-cell text-right font-semibold text-petrol-900 dark:text-white">{formatCurrency(s.totalAmount)}</td>
                    <td className="table-cell">{s.employeeName ?? '—'}</td>
                    <td className="table-cell capitalize">{s.paymentMethod.replace('_', ' ')}</td>
                    <td className="table-cell">
                      <span className="flex items-center gap-1 text-petrol-500 dark:text-petrol-400">
                        <Clock className="h-3 w-3" /> {formatTime(s.saleDate)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <Badge tone={statusTone(s.paymentStatus)}>{s.paymentStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
