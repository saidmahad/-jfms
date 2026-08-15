import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatLitres } from '../../lib/format.ts';

const COLORS = ['#FF7A00', '#0B3954', '#FFC107', '#16A34A', '#8a5cf6'];

export function FuelDonut({ data }: { data: { name: string; litres: number; revenue: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-petrol-400">No fuel sales yet</div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="litres"
          nameKey="name"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatLitres(Number(value)), name]}
          contentStyle={{ borderRadius: 12, border: '1px solid rgba(120,130,140,0.2)', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
