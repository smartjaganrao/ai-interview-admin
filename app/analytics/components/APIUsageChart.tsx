'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface APIUsageData {
  week: string;
  tokens: number;
  voiceMinutes: number;
  screenshots: number;
}

interface APIUsageChartProps {
  data: APIUsageData[];
  isLoading: boolean;
}

export default function APIUsageChart({ data, isLoading }: APIUsageChartProps) {
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
        API Usage by Week (Last 12 Weeks)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="week" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F3F4F6' }}
          />
          <Legend wrapperStyle={{ color: '#D1D5DB' }} />
          <Bar dataKey="tokens" fill="#3B82F6" name="Tokens (k)" />
          <Bar dataKey="voiceMinutes" fill="#10B981" name="Voice Min" />
          <Bar dataKey="screenshots" fill="#F59E0B" name="Screenshots" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
