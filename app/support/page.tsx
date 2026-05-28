'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';

interface Ticket {
  id: number;
  title: string;
  user: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  created: string;
  assigned: string | null;
  messages: { from: 'user' | 'admin'; text: string; time: string }[];
}

const TICKETS: Ticket[] = [
  { id: 1, title: 'Cannot login with Google', user: 'alice@example.com', status: 'open', priority: 'high', category: 'technical', created: '2026-05-27', assigned: null,
    messages: [{ from: 'user', text: 'When I click Google sign-in nothing happens.', time: '2h ago' }] },
  { id: 2, title: 'Feature request: dark mode', user: 'bob@example.com', status: 'open', priority: 'low', category: 'feature-request', created: '2026-05-26', assigned: null,
    messages: [{ from: 'user', text: 'Would love a light theme option.', time: '1d ago' }] },
  { id: 3, title: 'Billing issue - double charge', user: 'charlie@example.com', status: 'in-progress', priority: 'critical', category: 'billing', created: '2026-05-25', assigned: 'admin@company.com',
    messages: [
      { from: 'user', text: 'I was charged twice for Pro this month.', time: '2d ago' },
      { from: 'admin', text: 'Looking into this, will refund the duplicate shortly.', time: '1d ago' },
    ] },
  { id: 4, title: 'Need refund for March', user: 'diana@example.com', status: 'resolved', priority: 'medium', category: 'billing', created: '2026-05-20', assigned: 'admin@company.com',
    messages: [{ from: 'user', text: 'Please refund March.', time: '7d ago' }, { from: 'admin', text: 'Refunded ✓', time: '6d ago' }] },
];

const statusBadge = { open: 'badge-indigo', 'in-progress': 'badge-yellow', resolved: 'badge-green' };
const priorityBadge = { low: 'badge-slate', medium: 'badge-yellow', high: 'badge-orange', critical: 'badge-red' };

export default function SupportPage() {
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');

  const filtered = filter === 'all' ? TICKETS : TICKETS.filter((t) => t.status === filter);

  return (
    <AdminShell title="Support">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open', value: TICKETS.filter((t) => t.status === 'open').length, color: 'badge-indigo' },
          { label: 'In Progress', value: TICKETS.filter((t) => t.status === 'in-progress').length, color: 'badge-yellow' },
          { label: 'Resolved', value: TICKETS.filter((t) => t.status === 'resolved').length, color: 'badge-green' },
          { label: 'Critical', value: TICKETS.filter((t) => t.priority === 'critical').length, color: 'badge-red' },
        ].map((s, i) => (
          <div key={i} className="card py-4">
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'open', 'in-progress', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
          >
            {s === 'all' ? 'All Tickets' : s.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((t) => (
          <div
            key={t.id}
            onClick={() => setActive(t)}
            className="card cursor-pointer hover:border-indigo-500/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-white font-semibold">{t.title}</h3>
                  <span className={`badge ${priorityBadge[t.priority]}`}>{t.priority}</span>
                  <span className="badge badge-slate">{t.category}</span>
                </div>
                <p className="text-sm text-slate-400">From: {t.user} • {t.created}</p>
              </div>
              <div className="text-right">
                <span className={`badge ${statusBadge[t.status]}`}>{t.status.replace('-', ' ')}</span>
                <p className="text-xs text-slate-500 mt-2">{t.assigned || 'Unassigned'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Detail Drawer */}
      {active && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setActive(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg h-full glass-heavy p-6 overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Ticket #{active.id}</h2>
              <button onClick={() => setActive(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">{active.title}</h3>
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className={`badge ${statusBadge[active.status]}`}>{active.status.replace('-', ' ')}</span>
              <span className={`badge ${priorityBadge[active.priority]}`}>{active.priority}</span>
              <span className="badge badge-slate">{active.category}</span>
            </div>

            <div className="text-sm text-slate-400 mb-4">From: <span className="text-white">{active.user}</span></div>

            {/* Conversation */}
            <div className="space-y-3 mb-6">
              {active.messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-xl ${m.from === 'admin' ? 'bg-indigo-500/10 ml-8' : 'bg-slate-800/50 mr-8'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-300">{m.from === 'admin' ? 'You (Admin)' : active.user}</span>
                    <span className="text-xs text-slate-500">{m.time}</span>
                  </div>
                  <p className="text-sm text-slate-200">{m.text}</p>
                </div>
              ))}
            </div>

            {/* Reply */}
            <div className="space-y-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="input resize-none"
              />
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1">Send Reply</button>
                <select className="input w-40">
                  <option>Mark as...</option>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>
              </div>
              <button className="btn btn-secondary w-full">Assign to Me</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
