import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../lib/format.ts';

export function RevenueExpenseBar({ data }: { data: { date: string; revenue: number; expenses: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-petrol-100 dark:text-petrol-800" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8aa0b5' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#8aa0b5' }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => formatCurrency(v).replace('.00', '')}
        />
        <Tooltip
          formatter={(value, name) => [formatCurrency(Number(value)), name === 'revenue' ? 'Revenue' : 'Expenses']}
          contentStyle={{ borderRadius: 12, border: '1px solid rgba(120,130,140,0.2)', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" fill="#0B3954" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="expenses" fill="#FF7A00" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
