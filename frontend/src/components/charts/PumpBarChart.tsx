import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { formatCurrency } from '../../lib/format.ts';

export function PumpBarChart({ data }: { data: { pumpNumber: string; revenue: number; status: string }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-petrol-400">No pump data yet</div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-petrol-100 dark:text-petrol-800" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#8aa0b5' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v).replace('.00', '')} />
        <YAxis type="category" dataKey="pumpNumber" tick={{ fontSize: 11, fill: '#8aa0b5' }} axisLine={false} tickLine={false} width={72} />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
          contentStyle={{ borderRadius: 12, border: '1px solid rgba(120,130,140,0.2)', fontSize: 12 }}
        />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.status === 'active' ? '#FF7A00' : '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
