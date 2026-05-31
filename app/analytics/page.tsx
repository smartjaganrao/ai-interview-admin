'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData, dataSourceLabel } from '@/lib/useAdminData';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// Demo data — used when the admin backend isn't configured yet or the user
// isn't signed in. Replaced live by useAdminData hooks below.
const DEMO_DAU = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  users: Math.round(100 + Math.random() * 80 + i * 2),
}));

const DEMO_USAGE = [
  { week: 'W1', tokens: 4200, voiceMinutes: 1800, screenshots: 600 },
  { week: 'W2', tokens: 5100, voiceMinutes: 2200, screenshots: 720 },
  { week: 'W3', tokens: 4800, voiceMinutes: 2000, screenshots: 680 },
  { week: 'W4', tokens: 6200, voiceMinutes: 2800, screenshots: 910 },
];

const DEMO_REVENUE = [
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
  totalUsers: 342, totalMRR: 24500, activeThisWeek: 156, churnRate: 2.3,
  usersByPlan: { free: 245, pro: 76, power: 21 },
};

const tooltipStyle = { background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '0.5rem', color: '#fff' };

export default function AnalyticsPage() {
  const [range, setRange] = useState('30d');

  const kpiQuery = useAdminData<Kpis>('/api/analytics/kpis', DEMO_KPIS);
  const revenueQuery = useAdminData<{ month: string; mrr: number }[]>(
    '/api/analytics/revenue',
    DEMO_REVENUE,
    (json) => (json as { revenueData?: typeof DEMO_REVENUE }).revenueData || DEMO_REVENUE
  );
  const usageQuery = useAdminData<typeof DEMO_USAGE>(
    '/api/analytics/api-usage',
    DEMO_USAGE,
    (json) => {
      const arr = (json as { usageData?: typeof DEMO_USAGE }).usageData || [];
      return arr.length ? arr : DEMO_USAGE;
    }
  );

  const k = kpiQuery.data;
  // Overall data-source label: if any query is live, the page is live.
  const overallReason =
    kpiQuery.reason === 'live' || revenueQuery.reason === 'live' || usageQuery.reason === 'live'
      ? 'live'
      : kpiQuery.reason;
  const badge = dataSourceLabel(overallReason);

  const metrics = [
    { label: 'Total Users', value: String(k.totalUsers), live: kpiQuery.isLive },
    { label: 'Active (7d)', value: String(k.activeThisWeek), live: kpiQuery.isLive },
    { label: 'MRR', value: `₹${k.totalMRR.toLocaleString()}`, live: kpiQuery.isLive },
    { label: 'Churn', value: `${k.churnRate}%`, live: kpiQuery.isLive },
    // Not in API yet — always demo:
    { label: 'Avg Session', value: '18m', live: false },
    { label: 'Conversion', value: '12%', live: false },
  ];

  const planData = [
    { name: 'Free', value: k.usersByPlan.free, color: '#64748b' },
    { name: 'Pro', value: k.usersByPlan.pro, color: '#6366f1' },
    { name: 'Power', value: k.usersByPlan.power, color: '#a855f7' },
  ];

  return (
    <AdminShell title="Analytics">
      {/* Data source + range selector */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-slate-400">Performance metrics and trends</p>
          <span className={`badge ${badge.className}`}>{badge.text}</span>
        </div>
        <div className="flex items-center gap-2 p-1 rounded-xl glass">
          {['7d', '30d', '90d', '1y'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-smooth ${
                range === r ? 'gradient-primary text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {metrics.map((m, i) => (
          <div key={i} className="card py-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-slate-400">{m.label}</div>
              {!m.live && <span className="text-[10px] text-yellow-400">demo</span>}
            </div>
            <div className="text-2xl font-black text-white">{m.value}</div>
          </div>
        ))}
      </div>

      {/* DAU + Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-white">Daily Active Users</h2>
            <span className="text-[10px] text-yellow-400">demo — DAU API not yet built</span>
          </div>
          <p className="text-sm text-slate-400 mb-4">Last 30 days</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={DEMO_DAU}>
              <defs>
                <linearGradient id="dau" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} interval={4} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} fill="url(#dau)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-white mb-1">Plan Mix</h2>
          <p className="text-sm text-slate-400 mb-4">By subscription</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {planData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-1">Revenue Trend</h2>
          <p className="text-sm text-slate-400 mb-4">Monthly recurring revenue</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueQuery.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `₹${Number(v).toLocaleString()}`} />
              <Bar dataKey="mrr" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-white mb-1">Feature Usage</h2>
          <p className="text-sm text-slate-400 mb-4">Weekly activity</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={usageQuery.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Line type="monotone" dataKey="tokens" name="AI tokens (k)" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="voiceMinutes" name="Voice minutes" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="screenshots" name="Screenshots" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="btn btn-primary">📊 Export Report (CSV)</button>
      </div>
    </AdminShell>
  );
}
