'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { HeroChartDataPoint } from '@/types';

interface Props {
  data: HeroChartDataPoint[];
}

export function RevenueChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No chart data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : value} />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke="#8884d8" dot={false} name="Revenue" />
        <Line type="monotone" dataKey="commission" stroke="#82ca9d" dot={false} name="Commission" />
      </LineChart>
    </ResponsiveContainer>
  );
}
