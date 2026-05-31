'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueData {
  month: string;
  mrr: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  isLoading: boolean;
}

export default function RevenueChart({ data, isLoading }: RevenueChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-gray-700 bg-gray-800">
        <p className="text-gray-400">Loading chart...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">
        Monthly Recurring Revenue (MRR)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="month" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F3F4F6' }}
            formatter={(value: any) =>
              value ? `₹${Number(value).toLocaleString()}` : '₹0'
            }
          />
          <Line
            type="monotone"
            dataKey="mrr"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={{ fill: '#8B5CF6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
