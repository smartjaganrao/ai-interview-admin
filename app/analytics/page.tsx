'use client';

import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { Loader, ErrorState, EmptyState } from '@/components/DataStates';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Kpis {
  totalUsers: number; totalMRR: number; activeThisWeek: number; churnRate: number;
  usersByPlan: { free: number; quick_pass: number; pro: number; power: number };
}
const EMPTY_KPIS: Kpis = { totalUsers: 0, totalMRR: 0, activeThisWeek: 0, churnRate: 0, usersByPlan: { free: 0, quick_pass: 0, pro: 0, power: 0 } };

interface RevPoint { month: string; mrr: number }
interface UsagePoint { week: string; tokens: number; voiceMinutes: number; screenshots: number }

const T = { background: '#161B27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#C9D1D9' };
const PLAN_COLORS = ['#4B5563', '#10B981', '#6366F1', '#8B5CF6'];

export default function AnalyticsPage() {
  const kpiQ = useAdminData<Kpis>('/api/analytics/kpis', EMPTY_KPIS);
  const revQ = useAdminData<RevPoint[]>('/api/analytics/revenue', [],
    (j) => (j as { revenueData?: RevPoint[] }).revenueData || []);
  const useQ = useAdminData<UsagePoint[]>('/api/analytics/api-usage', [],
    (j) => (j as { usageData?: UsagePoint[] }).usageData || []);

  if (kpiQ.loading) {
    return <AdminShell title="Analytics"><Loader label="Loading analytics…" /></AdminShell>;
  }
  if (kpiQ.reason !== 'live') {
    return <AdminShell title="Analytics"><ErrorState reason={kpiQ.reason} onRetry={kpiQ.refetch} /></AdminShell>;
  }

  const k = kpiQ.data;
  const planData = [
    { name: 'Free', value: k.usersByPlan.free },
    { name: 'Quick Pass', value: k.usersByPlan.quick_pass },
    { name: 'Pro', value: k.usersByPlan.pro },
    { name: 'Power', value: k.usersByPlan.power },
  ];

  return (
    <AdminShell title="Analytics" subtitle="Revenue &amp; feature usage metrics">
      <span className="live-indicator" style={{ marginBottom: 20 }}>Live data</span>

      {/* Metrics (real only) */}
      <div className="stats-grid">
        {[
          { label: 'Total Users', value: String(k.totalUsers) },
          { label: 'Active (7d)', value: String(k.activeThisWeek) },
          { label: 'MRR', value: `₹${k.totalMRR.toLocaleString()}` },
          { label: 'Churn Rate', value: `${k.churnRate}%` },
        ].map((m, i) => (
          <div key={i} className="metric-card">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Plan mix + Revenue */}
      <div className="charts-row">
        <div className="card p-0">
          <div className="card-header" style={{ padding: '18px 20px 0' }}>
            <div><div className="card-title">Revenue Trend</div><div className="card-subtitle">Monthly recurring revenue</div></div>
          </div>
          <div style={{ padding: '8px 8px 16px', minHeight: 220 }}>
            {revQ.loading ? <Loader/> : revQ.data.length === 0 ? <EmptyState message="No revenue history yet" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revQ.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                  <XAxis dataKey="month" stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false}/>
                  <YAxis stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`}/>
                  <Tooltip contentStyle={T} formatter={(v) => `₹${Number(v).toLocaleString()}`}/>
                  <Bar dataKey="mrr" fill="#6366F1" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Plan Mix</div>
          <div className="card-subtitle">By subscription</div>
          {k.totalUsers === 0 ? <EmptyState message="No users yet" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {planData.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i]} stroke="none"/>)}
                </Pie>
                <Tooltip contentStyle={T}/>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#8B949E' }}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Feature usage */}
      <div className="card p-0">
        <div className="card-header" style={{ padding: '18px 20px 0' }}>
          <div><div className="card-title">Feature Usage</div><div className="card-subtitle">Weekly activity breakdown</div></div>
        </div>
        <div style={{ padding: '8px 8px 16px', minHeight: 240 }}>
          {useQ.loading ? <Loader/> : useQ.data.length === 0 ? <EmptyState message="No usage data recorded yet" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={useQ.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                <XAxis dataKey="week" stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false}/>
                <YAxis stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={T}/>
                <Legend wrapperStyle={{ fontSize: 11, color: '#8B949E' }}/>
                <Line type="monotone" dataKey="tokens" name="AI Tokens" stroke="#6366F1" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="voiceMinutes" name="Voice Min" stroke="#10B981" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="screenshots" name="Screenshots" stroke="#F59E0B" strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
