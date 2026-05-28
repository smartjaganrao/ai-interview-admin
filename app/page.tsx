'use client';

import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { useAdminData, dataSourceLabel } from '@/lib/useAdminData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const revenueData = [
  { month: 'Jun', mrr: 8200 }, { month: 'Jul', mrr: 10400 }, { month: 'Aug', mrr: 12800 },
  { month: 'Sep', mrr: 15200 }, { month: 'Oct', mrr: 17600 }, { month: 'Nov', mrr: 19800 },
  { month: 'Dec', mrr: 21500 }, { month: 'Jan', mrr: 22900 }, { month: 'Feb', mrr: 23800 },
  { month: 'Mar', mrr: 24100 }, { month: 'Apr', mrr: 24300 }, { month: 'May', mrr: 24500 },
];

interface Kpis {
  totalUsers: number;
  totalMRR: number;
  activeThisWeek: number;
  churnRate: number;
  usersByPlan: { free: number; pro: number; power: number };
}

const DEMO_KPIS: Kpis = {
  totalUsers: 342,
  totalMRR: 24500,
  activeThisWeek: 156,
  churnRate: 2.3,
  usersByPlan: { free: 245, pro: 76, power: 21 },
};

export default function AdminDashboard() {
  const { data: k, reason } = useAdminData<Kpis>('/api/analytics/kpis', DEMO_KPIS);
  const badge = dataSourceLabel(reason);

  const kpis = [
    { label: 'Total Users', value: String(k.totalUsers), icon: '👥', color: 'from-blue-500 to-cyan-500' },
    { label: 'MRR Revenue', value: `₹${k.totalMRR.toLocaleString()}`, icon: '💰', color: 'from-green-500 to-emerald-500' },
    { label: 'Active This Week', value: String(k.activeThisWeek), icon: '⚡', color: 'from-indigo-500 to-purple-500' },
    { label: 'Churn Rate', value: `${k.churnRate}%`, icon: '📉', color: 'from-orange-500 to-red-500' },
  ];

  const planData = [
    { name: 'Free', value: k.usersByPlan.free, color: '#64748b' },
    { name: 'Pro', value: k.usersByPlan.pro, color: '#6366f1' },
    { name: 'Power', value: k.usersByPlan.power, color: '#a855f7' },
  ];

  return (
    <AdminShell title="Dashboard">
      {/* Data source badge */}
      <div className="mb-4">
        <span className={`badge ${badge.className}`}>{badge.text}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-xl`}>
                {kpi.icon}
              </div>
            </div>
            <div className="text-3xl font-black text-white mb-1">{kpi.value}</div>
            <div className="text-sm text-slate-400">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Revenue */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Revenue Trend</h2>
              <p className="text-sm text-slate-400">Monthly recurring revenue (last 12 months)</p>
            </div>
            <span className="badge badge-green">+198% YoY</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '0.5rem', color: '#fff' }}
                formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'MRR']}
              />
              <Area type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2} fill="url(#mrrGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-1">Plan Distribution</h2>
          <p className="text-sm text-slate-400 mb-4">Users by subscription tier</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={planData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {planData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '0.5rem', color: '#fff' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { icon: '🆕', text: 'New user signed up', detail: 'priya@example.com', time: '2 min ago', badge: 'badge-green' },
              { icon: '🚀', text: 'Upgraded to Pro', detail: 'alice@example.com', time: '18 min ago', badge: 'badge-indigo' },
              { icon: '💬', text: 'New support ticket', detail: 'Billing issue', time: '1 hour ago', badge: 'badge-yellow' },
              { icon: '⚡', text: 'Upgraded to Power', detail: 'marcus@example.com', time: '3 hours ago', badge: 'badge-purple' },
              { icon: '🆕', text: 'New user signed up', detail: 'john@example.com', time: '5 hours ago', badge: 'badge-green' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-smooth">
                <div className="text-2xl">{a.icon}</div>
                <div className="flex-1">
                  <div className="text-white font-medium">{a.text}</div>
                  <div className="text-sm text-slate-400">{a.detail}</div>
                </div>
                <div className="text-xs text-slate-500">{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/users" className="btn btn-primary w-full">👥 Manage Users</Link>
            <Link href="/analytics" className="btn btn-secondary w-full">📈 View Analytics</Link>
            <Link href="/support" className="btn btn-secondary w-full">💬 Support Inbox</Link>
            <Link href="/audit" className="btn btn-ghost w-full">📋 Audit Logs</Link>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
            <div className="text-sm text-slate-300 mb-1">💡 System Status</div>
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              All systems operational
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
