'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData, dataSourceLabel } from '@/lib/useAdminData';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const DEMO_DAU = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`, users: Math.round(100 + Math.sin(i / 3) * 30 + i * 1.5),
}));
const DEMO_REVENUE = [
  { month: 'Jun', mrr: 8200 }, { month: 'Jul', mrr: 10400 }, { month: 'Aug', mrr: 12800 },
  { month: 'Sep', mrr: 15200 }, { month: 'Oct', mrr: 17600 }, { month: 'Nov', mrr: 19800 },
  { month: 'Dec', mrr: 21500 }, { month: 'Jan', mrr: 22900 }, { month: 'Feb', mrr: 23800 },
  { month: 'Mar', mrr: 24100 }, { month: 'Apr', mrr: 24300 }, { month: 'May', mrr: 24500 },
];
const DEMO_USAGE = [
  { week: 'W1', tokens: 4200, voiceMinutes: 1800, screenshots: 600 },
  { week: 'W2', tokens: 5100, voiceMinutes: 2200, screenshots: 720 },
  { week: 'W3', tokens: 4800, voiceMinutes: 2000, screenshots: 680 },
  { week: 'W4', tokens: 6200, voiceMinutes: 2800, screenshots: 910 },
];

interface Kpis {
  totalUsers: number; totalMRR: number; activeThisWeek: number; churnRate: number;
  usersByPlan: { free: number; pro: number; power: number };
}
const DEMO_KPIS: Kpis = {
  totalUsers: 342, totalMRR: 24500, activeThisWeek: 156, churnRate: 2.3,
  usersByPlan: { free: 245, pro: 76, power: 21 },
};

const T = { background: '#161B27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#C9D1D9' };
const PLAN_COLORS = ['#4B5563', '#6366F1', '#8B5CF6'];

export default function AnalyticsPage() {
  const [range, setRange] = useState('30d');
  const { data: k, reason } = useAdminData<Kpis>('/api/analytics/kpis', DEMO_KPIS);
  const { data: revenueData, reason: rr } = useAdminData('/api/analytics/revenue', DEMO_REVENUE,
    (j) => (j as { revenueData?: typeof DEMO_REVENUE }).revenueData || DEMO_REVENUE);
  const { data: usageData } = useAdminData('/api/analytics/api-usage', DEMO_USAGE,
    (j) => { const a = (j as { usageData?: typeof DEMO_USAGE }).usageData || []; return a.length ? a : DEMO_USAGE; });
  const badge = dataSourceLabel(reason);
  const planData = [
    { name: 'Free', value: k.usersByPlan.free }, { name: 'Pro', value: k.usersByPlan.pro }, { name: 'Power', value: k.usersByPlan.power },
  ];

  return (
    <AdminShell title="Analytics">
      <div className="flex items-center justify-between mb-4">
        <span className={`badge ${badge.className}`}>{badge.text}</span>
        <div className="flex items-center gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          {['7d','30d','90d','1y'].map((r) => (
            <button key={r} onClick={() => setRange(r)}
              style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: range === r ? 'var(--primary)' : 'transparent', color: range === r ? 'white' : 'var(--text-muted)', border: 'none', transition: 'all 0.15s' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 6 metrics */}
      <div className="metrics-grid">
        {[
          { label: 'Total Users', value: String(k.totalUsers), live: true },
          { label: 'Active (7d)', value: String(k.activeThisWeek), live: true },
          { label: 'MRR', value: `₹${k.totalMRR.toLocaleString()}`, live: true },
          { label: 'Churn', value: `${k.churnRate}%`, live: true },
          { label: 'Avg Session', value: '18m', live: false },
          { label: 'Conversion', value: '12%', live: false },
        ].map((m, i) => (
          <div key={i} className="metric-card">
            <div className="metric-label">
              {m.label}
              {!m.live && <span className="metric-demo-tag">demo</span>}
            </div>
            <div className="metric-value">{m.value}</div>
          </div>
        ))}
      </div>

      {/* DAU + Plan */}
      <div className="charts-row">
        <div className="card p-0">
          <div className="card-header" style={{ padding: '18px 20px 0' }}>
            <div>
              <div className="card-title">Daily Active Users</div>
              <div className="card-subtitle">Last 30 days</div>
            </div>
            <span className="badge badge-slate">demo</span>
          </div>
          <div style={{ padding: '8px 8px 16px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={DEMO_DAU}>
                <defs>
                  <linearGradient id="dauG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                <XAxis dataKey="day" stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} interval={4}/>
                <YAxis stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={T}/>
                <Area type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2} fill="url(#dauG)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Plan Mix</div>
          <div className="card-subtitle">By subscription</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={planData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {planData.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i]} stroke="none"/>)}
              </Pie>
              <Tooltip contentStyle={T}/>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#8B949E' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue + Usage */}
      <div className="two-col">
        <div className="card p-0">
          <div className="card-header" style={{ padding: '18px 20px 0' }}>
            <div>
              <div className="card-title">Revenue Trend</div>
              <div className="card-subtitle">Monthly recurring revenue</div>
            </div>
          </div>
          <div style={{ padding: '8px 8px 16px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData as typeof DEMO_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                <XAxis dataKey="month" stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false}/>
                <YAxis stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`}/>
                <Tooltip contentStyle={T} formatter={(v) => `₹${Number(v).toLocaleString()}`}/>
                <Bar dataKey="mrr" fill="#6366F1" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-0">
          <div className="card-header" style={{ padding: '18px 20px 0' }}>
            <div>
              <div className="card-title">Feature Usage</div>
              <div className="card-subtitle">Weekly activity breakdown</div>
            </div>
          </div>
          <div style={{ padding: '8px 8px 16px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={usageData as typeof DEMO_USAGE}>
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
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Report
        </button>
      </div>
    </AdminShell>
  );
}
