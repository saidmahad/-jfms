import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '../../lib/format.ts';

export function SalesLineChart({ data }: { data: { label: string; revenue: number; litres: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF7A00" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#FF7A00" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-petrol-100 dark:text-petrol-800" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8aa0b5' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#8aa0b5' }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => formatCurrency(v).replace('.00', '')}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid rgba(120,130,140,0.2)',
            fontSize: 12,
            background: 'var(--tooltip-bg, #fff)',
          }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#FF7A00" strokeWidth={2.5} fill="url(#salesFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
