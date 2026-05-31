'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData, dataSourceLabel } from '@/lib/useAdminData';

interface Log {
  id: string | number;
  admin: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
  ip: string;
}

interface ApiLog {
  id: string;
  adminEmail: string;
  action: string;
  targetUserEmail: string;
  details: Record<string, unknown> | string;
  timestamp: number;
  ipAddress: string;
}

const DEMO_LOGS: Log[] = [
  { id: 1, admin: 'admin@company.com', action: 'user_upgrade', target: 'alice@example.com', details: 'Free → Pro', timestamp: '2026-05-27 14:30', ip: '192.168.1.1' },
  { id: 2, admin: 'admin@company.com', action: 'quota_reset', target: 'bob@example.com', details: 'Reset all quotas', timestamp: '2026-05-27 13:15', ip: '192.168.1.1' },
  { id: 3, admin: 'mod@company.com', action: 'user_ban', target: 'spammer@example.com', details: 'Spam detected', timestamp: '2026-05-27 11:45', ip: '192.168.1.5' },
  { id: 4, admin: 'admin@company.com', action: 'user_upgrade', target: 'charlie@example.com', details: 'Pro → Power', timestamp: '2026-05-26 16:20', ip: '192.168.1.1' },
  { id: 5, admin: 'admin@company.com', action: 'refund_issued', target: 'diana@example.com', details: '₹499 refunded', timestamp: '2026-05-26 10:05', ip: '192.168.1.1' },
  { id: 6, admin: 'mod@company.com', action: 'content_delete', target: 'evan@example.com', details: 'Flagged answer removed', timestamp: '2026-05-25 18:30', ip: '192.168.1.5' },
];

const actionBadge: Record<string, string> = {
  user_upgrade: 'badge-indigo', quota_reset: 'badge-yellow', user_ban: 'badge-red',
  refund_issued: 'badge-orange', content_delete: 'badge-purple',
};

/** Turn the details JSON into a readable one-liner. */
function formatDetails(d: Record<string, unknown> | string): string {
  if (typeof d === 'string') return d;
  if (!d || typeof d !== 'object') return '';
  if ('oldPlan' in d && 'newPlan' in d) return `${d.oldPlan} → ${d.newPlan}`;
  if ('reason' in d) return String(d.reason);
  if ('refundAmount' in d) return `₹${d.refundAmount} refunded`;
  if ('duration' in d) return `Reset for ${d.duration}`;
  return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ').slice(0, 80);
}

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const url = `/api/audit/logs?limit=100${actionFilter !== 'all' ? `&action=${actionFilter}` : ''}`;
  const { data: logs, reason } = useAdminData<Log[]>(url, DEMO_LOGS, (json) => {
    const arr = (json as { logs?: ApiLog[] }).logs || [];
    return arr.map((l) => ({
      id: l.id,
      admin: l.adminEmail,
      action: l.action,
      target: l.targetUserEmail || '—',
      details: formatDetails(l.details),
      timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString() : '—',
      ip: l.ipAddress || '—',
    }));
  });
  const badge = dataSourceLabel(reason);

  const filtered = logs.filter((l) => {
    const s = search.toLowerCase();
    return l.target.toLowerCase().includes(s) || l.admin.toLowerCase().includes(s);
  });

  return (
    <AdminShell title="Audit Logs">
      <div className="mb-4">
        <span className={`badge ${badge.className}`}>{badge.text}</span>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by admin or target user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input md:w-52">
            <option value="all">All Actions</option>
            <option value="user_upgrade">Plan Upgrade</option>
            <option value="quota_reset">Quota Reset</option>
            <option value="user_ban">User Ban</option>
            <option value="refund_issued">Refund</option>
            <option value="content_delete">Content Delete</option>
          </select>
          <button className="btn btn-secondary">📥 Export</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
                <th>Timestamp</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td className="text-white font-medium">{log.admin}</td>
                  <td><span className={`badge ${actionBadge[log.action] || 'badge-slate'}`}>{log.action.replace(/_/g, ' ')}</span></td>
                  <td className="text-slate-300">{log.target}</td>
                  <td className="text-slate-400">{log.details}</td>
                  <td className="text-slate-400 text-sm font-mono">{log.timestamp}</td>
                  <td className="text-slate-500 text-sm font-mono">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">No audit entries match your filters</div>
        )}
      </div>

      <p className="text-slate-400 text-sm mt-4">{filtered.length} audit entries • Immutable log</p>
    </AdminShell>
  );
}
