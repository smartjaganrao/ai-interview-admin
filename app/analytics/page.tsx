'use client';

import Link from 'next/link';

export default function AnalyticsPage() {
  const metrics = [
    { label: 'Total Users', value: '342', change: '+12%' },
    { label: 'Active Users (7d)', value: '156', change: '+8%' },
    { label: 'MRR Revenue', value: '₹24,500', change: '+15%' },
    { label: 'Churn Rate', value: '2.3%', change: '-0.5%' },
    { label: 'Avg Session', value: '18 min', change: '+2 min' },
    { label: 'Trial Conversion', value: '12%', change: '+3%' },
  ];

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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition text-slate-300 ${
                  item.href === '/analytics' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`}
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
          <h1 className="text-3xl font-bold text-white mb-8">Analytics Dashboard</h1>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {metrics.map((metric, idx) => (
              <div key={idx} className="p-6 rounded-lg bg-slate-900/50 border border-slate-800">
                <p className="text-slate-400 text-sm mb-2">{metric.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                  <p className="text-sm text-green-400">{metric.change}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold text-white mb-4">Revenue Trend (Last 12 months)</h2>
              <div className="h-80 bg-slate-800/50 rounded flex items-center justify-center text-slate-500">
                [Revenue Line Chart - Recharts Ready]
              </div>
            </div>

            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold text-white mb-4">Plan Distribution</h2>
              <div className="h-80 bg-slate-800/50 rounded flex items-center justify-center text-slate-500">
                [Plan Pie Chart - Recharts Ready]
              </div>
            </div>

            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold text-white mb-4">Daily Active Users</h2>
              <div className="h-80 bg-slate-800/50 rounded flex items-center justify-center text-slate-500">
                [DAU Line Chart - Recharts Ready]
              </div>
            </div>

            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-semibold text-white mb-4">Feature Usage</h2>
              <div className="h-80 bg-slate-800/50 rounded flex items-center justify-center text-slate-500">
                [Feature Bar Chart - Recharts Ready]
              </div>
            </div>
          </div>

          {/* Export */}
          <button className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white font-semibold">
            📊 Export to CSV
          </button>
        </div>
      </div>
    </div>
  );
}
