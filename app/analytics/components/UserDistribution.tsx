'use client';

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface UsersByPlan {
  free: number;
  pro: number;
  power: number;
}

interface UserDistributionProps {
  usersByPlan: UsersByPlan;
  isLoading: boolean;
}

export default function UserDistribution({
  usersByPlan,
  isLoading,
}: UserDistributionProps) {
  const data = [
    { name: 'Free', value: usersByPlan.free },
    { name: 'Pro', value: usersByPlan.pro },
    { name: 'Power', value: usersByPlan.power },
  ];

  const COLORS = ['#6B7280', '#3B82F6', '#A855F7'];

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
        User Distribution by Plan
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            fill="#8B5CF6"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F3F4F6' }}
          />
          <Legend
            wrapperStyle={{ color: '#D1D5DB' }}
            formatter={(value) => <span style={{ color: '#D1D5DB' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
