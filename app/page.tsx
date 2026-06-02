'use client';

import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { Loader, ErrorState, EmptyState } from '@/components/DataStates';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Kpis {
  totalUsers: number;
  totalMRR: number;
  activeThisWeek: number;
  churnRate: number;
  usersByPlan: { free: number; pro: number; power: number };
}
const EMPTY_KPIS: Kpis = {
  totalUsers: 0, totalMRR: 0, activeThisWeek: 0, churnRate: 0,
  usersByPlan: { free: 0, pro: 0, power: 0 },
};

interface RevPoint { month: string; mrr: number }
interface ApiLog { adminEmail: string; action: string; targetUserEmail: string; timestamp: number }

const tooltipStyle = { background: '#161B27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#C9D1D9' };
const PLAN_COLORS = ['#4B5563', '#6366F1', '#8B5CF6'];

const ACTION_DOT: Record<string, string> = {
  user_upgrade: '#6366F1', user_ban: '#EF4444', quota_reset: '#F59E0B',
  refund_issued: '#FB923C', content_delete: '#8B5CF6',
};

function relTime(ts: number): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminDashboard() {
  const kpiQ = useAdminData<Kpis>('/api/analytics/kpis', EMPTY_KPIS);
  const revQ = useAdminData<RevPoint[]>(
    '/api/analytics/revenue', [],
    (j) => (j as { revenueData?: RevPoint[] }).revenueData || []
  );
  const actQ = useAdminData<ApiLog[]>(
    '/api/audit/logs?limit=6', [],
    (j) => (j as { logs?: ApiLog[] }).logs || []
  );

  // Gate the whole page on the primary KPIs request.
  if (kpiQ.loading) {
    return <AdminShell title="Dashboard"><Loader label="Loading dashboard…" /></AdminShell>;
  }
  if (kpiQ.reason !== 'live') {
    return <AdminShell title="Dashboard"><ErrorState reason={kpiQ.reason} onRetry={kpiQ.refetch} /></AdminShell>;
  }

  const k = kpiQ.data;
  const planData = [
    { name: 'Free', value: k.usersByPlan.free },
    { name: 'Pro', value: k.usersByPlan.pro },
    { name: 'Power', value: k.usersByPlan.power },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="mb-4"><span className="badge badge-green">● Live data</span></div>

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
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="stat-value">₹{k.totalMRR.toLocaleString()}</div>
          <div className="stat-label">Monthly Revenue</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-indigo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div className="stat-value">{k.activeThisWeek}</div>
          <div className="stat-label">Active This Week</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
            </svg>
          </div>
          <div className="stat-value">{k.churnRate}%</div>
          <div className="stat-label">Churn Rate</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="card p-0">
          <div className="card-header" style={{ padding: '20px 20px 0' }}>
            <div>
              <div className="card-title">Revenue Trend</div>
              <div className="card-subtitle">Monthly recurring revenue</div>
            </div>
          </div>
          <div style={{ padding: '0 8px 16px', minHeight: 240 }}>
            {revQ.loading ? (
              <Loader />
            ) : revQ.data.length === 0 ? (
              <EmptyState message="No revenue history yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revQ.data}>
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
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Plan Distribution</div>
          <div className="card-subtitle">Users by subscription tier</div>
          {k.totalUsers === 0 ? (
            <EmptyState message="No users yet" />
          ) : (
            <>
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
                  { label: 'Free', value: k.usersByPlan.free },
                  { label: 'Pro', value: k.usersByPlan.pro },
                  { label: 'Power', value: k.usersByPlan.power },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLORS[i] }}/>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Activity + Quick Actions */}
      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Latest admin actions</div>
            </div>
            <Link href="/audit" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {actQ.loading ? (
            <Loader />
          ) : actQ.data.length === 0 ? (
            <EmptyState message="No activity recorded yet" />
          ) : (
            actQ.data.map((a, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" style={{ background: ACTION_DOT[a.action] || '#10B981' }}/>
                <div className="activity-text">
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{(a.action || 'event').replace(/_/g, ' ')}</div>
                  <div className="text-muted text-sm">{a.targetUserEmail || a.adminEmail}</div>
                </div>
                <div className="activity-time">{relTime(a.timestamp)}</div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-title mb-3">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Link href="/users" className="btn btn-primary w-full">Manage Users</Link>
              <Link href="/analytics" className="btn btn-secondary w-full">View Analytics</Link>
              <Link href="/support" className="btn btn-secondary w-full">Support Inbox</Link>
              <Link href="/audit" className="btn btn-ghost w-full">Audit Logs</Link>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
