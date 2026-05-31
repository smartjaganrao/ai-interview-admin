'use client';

interface KPICardsProps {
  totalUsers: number;
  activeThisWeek: number;
  totalMRR: number;
  churnRate: number;
  isLoading: boolean;
}

export default function KPICards({
  totalUsers,
  activeThisWeek,
  totalMRR,
  churnRate,
  isLoading,
}: KPICardsProps) {
  const cards = [
    {
      label: 'Total Users',
      value: totalUsers.toLocaleString(),
      subtext: 'All registered users',
      color: 'from-blue-600 to-blue-700',
    },
    {
      label: 'Active This Week',
      value: activeThisWeek.toLocaleString(),
      subtext: 'Users with sessions',
      color: 'from-green-600 to-green-700',
    },
    {
      label: 'Monthly Revenue (MRR)',
      value: `₹${totalMRR.toLocaleString()}`,
      subtext: 'Active subscriptions',
      color: 'from-purple-600 to-purple-700',
    },
    {
      label: 'Churn Rate',
      value: `${churnRate.toFixed(1)}%`,
      subtext: 'This month',
      color: 'from-orange-600 to-orange-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`rounded-lg border border-gray-700 bg-gradient-to-br ${card.color} p-6`}
        >
          <p className="text-sm font-medium text-gray-200">{card.label}</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {isLoading ? '—' : card.value}
          </p>
          <p className="mt-1 text-xs text-gray-300">{card.subtext}</p>
        </div>
      ))}
    </div>
  );
}
