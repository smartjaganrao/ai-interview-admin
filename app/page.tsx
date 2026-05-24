'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ totalUsers: 0, mrrRevenue: 0, activeThisWeek: 0, churnRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real stats from Firebase
    setStats({
      totalUsers: 342,
      mrrRevenue: 24500,
      activeThisWeek: 156,
      churnRate: 2.3,
    });
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-slate-900 border-r border-slate-800">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"></div>
            <span className="text-lg font-bold text-white">Admin Panel</span>
          </div>

          <nav className="space-y-2">
            {[
              { label: 'Dashboard', href: '/', icon: '📊' },
              { label: 'Users', href: '/users', icon: '👥' },
              { label: 'Analytics', href: '/analytics', icon: '📈' },
              { label: 'Audit Logs', href: '/audit', icon: '📋' },
              { label: 'Support', href: '/support', icon: '💬' },
              { label: 'Settings', href: '/settings', icon: '⚙️' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition text-slate-300 hover:text-white"
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <Link
            href="/login"
            className="w-full py-2 px-4 rounded-lg border border-slate-700 text-sm text-center text-slate-300 hover:text-white hover:border-slate-600 transition"
          >
            Sign Out
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Users', value: stats.totalUsers, color: 'from-blue-500' },
              { label: 'MRR Revenue', value: `₹${stats.mrrRevenue.toLocaleString()}`, color: 'from-green-500' },
              { label: 'Active This Week', value: stats.activeThisWeek, color: 'from-purple-500' },
              { label: 'Churn Rate', value: `${stats.churnRate}%`, color: 'from-orange-500' },
            ].map((card, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-lg bg-gradient-to-br ${card.color}/10 border border-slate-800`}
              >
                <p className="text-slate-400 text-sm mb-2">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold text-white mb-4">Revenue Trend</h2>
              <div className="h-64 bg-slate-800/50 rounded flex items-center justify-center text-slate-500">
                [Revenue Chart - Coming Soon]
              </div>
            </div>

            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold text-white mb-4">Plan Distribution</h2>
              <div className="h-64 bg-slate-800/50 rounded flex items-center justify-center text-slate-500">
                [Plan Distribution Chart - Coming Soon]
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 p-6 rounded-lg border border-slate-800 bg-slate-900/50">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="flex gap-4">
              <Link
                href="/users"
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white font-semibold"
              >
                Manage Users
              </Link>
              <Link
                href="/analytics"
                className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-white font-semibold"
              >
                View Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
