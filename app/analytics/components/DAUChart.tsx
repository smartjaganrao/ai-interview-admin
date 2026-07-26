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

interface DAUData {
  date: string;
  users: number;
}

interface DAUChartProps {
  data: DAUData[];
  isLoading: boolean;
}

function buildMockData(): DAUData[] {
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: Math.floor(Math.random() * 100) + 50,
    };
  });
}

const MOCK_DATA = buildMockData();

export default function DAUChart({ data, isLoading }: DAUChartProps) {
  const chartData = data && data.length > 0 ? data : MOCK_DATA;

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
        Daily Active Users (Last 30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F3F4F6' }}
          />
          <Line
            type="monotone"
            dataKey="users"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
