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
  totalUsers: 342, totalMRR: 24500, activeThisWeek: 156, churnRate: 2.3,
  usersByPlan: { free: 245, pro: 76, power: 21 },
};

const tooltipStyle = {
  background: '#161B27',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#C9D1D9',
};

const PLAN_COLORS = ['#4B5563', '#6366F1', '#8B5CF6'];

const ACTIVITY = [
  { color: '#10B981', text: 'New user signed up', sub: 'priya@example.com', time: '2 min ago' },
  { color: '#6366F1', text: 'Plan upgraded to Pro', sub: 'alice@example.com', time: '18 min ago' },
  { color: '#F59E0B', text: 'Support ticket opened', sub: 'Billing issue #1234', time: '1 hr ago' },
  { color: '#8B5CF6', text: 'Plan upgraded to Power', sub: 'marcus@example.com', time: '3 hrs ago' },
  { color: '#10B981', text: 'New user signed up', sub: 'john@example.com', time: '5 hrs ago' },
];

export default function AdminDashboard() {
  const { data: k, reason } = useAdminData<Kpis>('/api/analytics/kpis', DEMO_KPIS);
  const badge = dataSourceLabel(reason);

  const planData = [
    { name: 'Free', value: k.usersByPlan.free },
    { name: 'Pro', value: k.usersByPlan.pro },
    { name: 'Power', value: k.usersByPlan.power },
  ];

  return (
    <AdminShell title="Dashboard">
      {/* Data source indicator */}
      <div className="mb-4">
        <span className={`badge ${badge.className}`}>{badge.text}</span>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="stat-value">{k.totalUsers.toLocaleString()}</div>
          <div className="stat-label">Total Users</div>
          <div className="stat-change stat-change-up">↑ +12% this month</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="stat-value">₹{k.totalMRR.toLocaleString()}</div>
          <div className="stat-label">Monthly Revenue</div>
          <div className="stat-change stat-change-up">↑ +15% vs last month</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-indigo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div className="stat-value">{k.activeThisWeek}</div>
          <div className="stat-label">Active This Week</div>
          <div className="stat-change stat-change-up">↑ +8% vs last week</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
              <polyline points="17 18 23 18 23 12"/>
            </svg>
          </div>
          <div className="stat-value">{k.churnRate}%</div>
          <div className="stat-label">Churn Rate</div>
          <div className="stat-change stat-change-up">↓ -0.5% improved</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="charts-row">
        {/* Revenue trend */}
        <div className="card p-0" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '20px 20px 0' }}>
            <div>
              <div className="card-title">Revenue Trend</div>
              <div className="card-subtitle">Monthly recurring revenue — last 12 months</div>
            </div>
            <span className="badge badge-green">+198% YoY</span>
          </div>
          <div style={{ padding: '0 8px 16px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                <XAxis dataKey="month" stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false}/>
                <YAxis stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`}/>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'MRR']}/>
                <Area type="monotone" dataKey="mrr" stroke="#6366F1" strokeWidth={2} fill="url(#mrrGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan distribution */}
        <div className="card">
          <div className="card-title">Plan Distribution</div>
          <div className="card-subtitle">Users by subscription tier</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {planData.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i]} stroke="none"/>)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle}/>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#8B949E' }}/>
            </PieChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 12 }}>
            {[
              { label: 'Free', value: k.usersByPlan.free, pct: Math.round(k.usersByPlan.free / k.totalUsers * 100) },
              { label: 'Pro', value: k.usersByPlan.pro, pct: Math.round(k.usersByPlan.pro / k.totalUsers * 100) },
              { label: 'Power', value: k.usersByPlan.power, pct: Math.round(k.usersByPlan.power / k.totalUsers * 100) },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLORS[i], flexShrink: 0 }}/>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{row.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 32, textAlign: 'right' }}>{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Activity + Quick Actions */}
      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Latest events across the platform</div>
            </div>
            <Link href="/audit" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {ACTIVITY.map((a, i) => (
            <div key={i} className="activity-item">
              <div className="activity-dot" style={{ background: a.color }}/>
              <div className="activity-text">
                <div style={{ fontWeight: 500, marginBottom: 2 }}>{a.text}</div>
                <div className="text-muted text-sm">{a.sub}</div>
              </div>
              <div className="activity-time">{a.time}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-title mb-3">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Link href="/users" className="btn btn-primary w-full">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                Manage Users
              </Link>
              <Link href="/analytics" className="btn btn-secondary w-full">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                View Analytics
              </Link>
              <Link href="/support" className="btn btn-secondary w-full">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Support Inbox
              </Link>
              <Link href="/audit" className="btn btn-ghost w-full">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Audit Logs
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}/>
              <span className="text-sm font-semibold" style={{ color: '#10B981' }}>All Systems Operational</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Firebase, Razorpay, Vercel — all healthy. Last checked 2 min ago.
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
