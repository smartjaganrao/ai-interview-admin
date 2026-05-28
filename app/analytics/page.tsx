'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const dauData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  users: Math.round(100 + Math.random() * 80 + i * 2),
}));

const usageData = [
  { week: 'W1', answers: 4200, voice: 1800, screenshots: 600 },
  { week: 'W2', answers: 5100, voice: 2200, screenshots: 720 },
  { week: 'W3', answers: 4800, voice: 2000, screenshots: 680 },
  { week: 'W4', answers: 6200, voice: 2800, screenshots: 910 },
];

const revenueData = [
  { month: 'Jan', pro: 14000, power: 8000 },
  { month: 'Feb', pro: 15500, power: 9000 },
  { month: 'Mar', pro: 16000, power: 10000 },
  { month: 'Apr', pro: 16500, power: 11000 },
  { month: 'May', pro: 17000, power: 12000 },
];

const planData = [
  { name: 'Free', value: 245, color: '#64748b' },
  { name: 'Pro', value: 76, color: '#6366f1' },
  { name: 'Power', value: 21, color: '#a855f7' },
];

const tooltipStyle = { background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '0.5rem', color: '#fff' };

export default function AnalyticsPage() {
  const [range, setRange] = useState('30d');

  const metrics = [
    { label: 'Total Users', value: '342', change: '+12%', up: true },
    { label: 'Active (7d)', value: '156', change: '+8%', up: true },
    { label: 'MRR', value: '₹24,500', change: '+15%', up: true },
    { label: 'Churn', value: '2.3%', change: '-0.5%', up: true },
    { label: 'Avg Session', value: '18m', change: '+2m', up: true },
    { label: 'Conversion', value: '12%', change: '+3%', up: true },
  ];

  return (
    <AdminShell title="Analytics">
      {/* Range selector */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-slate-400">Performance metrics and trends</p>
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
            <div className="text-xs text-slate-400 mb-1">{m.label}</div>
            <div className="text-2xl font-black text-white">{m.value}</div>
            <div className={`text-xs ${m.up ? 'text-green-400' : 'text-red-400'}`}>{m.change}</div>
          </div>
        ))}
      </div>

      {/* DAU + Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-1">Daily Active Users</h2>
          <p className="text-sm text-slate-400 mb-4">Last 30 days</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dauData}>
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
          <h2 className="text-lg font-bold text-white mb-1">Revenue by Plan</h2>
          <p className="text-sm text-slate-400 mb-4">Pro vs Power (monthly)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `₹${Number(v).toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="pro" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="power" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-white mb-1">Feature Usage</h2>
          <p className="text-sm text-slate-400 mb-4">Weekly activity</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Line type="monotone" dataKey="answers" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="voice" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="screenshots" stroke="#f59e0b" strokeWidth={2} dot={false} />
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
