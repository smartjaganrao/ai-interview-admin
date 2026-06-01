'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData, dataSourceLabel } from '@/lib/useAdminData';

interface Log {
  id: string|number; admin: string; action: string; target: string;
  details: string; timestamp: string; ip: string;
}
interface ApiLog {
  id: string; adminEmail: string; action: string; targetUserEmail: string;
  details: Record<string,unknown>|string; timestamp: number; ipAddress: string;
}

const DEMO_LOGS: Log[] = [
  { id:1, admin:'admin@company.com', action:'user_upgrade', target:'alice@example.com', details:'Free → Pro', timestamp:'2026-05-27 14:30', ip:'192.168.1.1' },
  { id:2, admin:'admin@company.com', action:'quota_reset', target:'bob@example.com', details:'Reset all quotas', timestamp:'2026-05-27 13:15', ip:'192.168.1.1' },
  { id:3, admin:'mod@company.com', action:'user_ban', target:'spammer@example.com', details:'Spam detected', timestamp:'2026-05-27 11:45', ip:'192.168.1.5' },
  { id:4, admin:'admin@company.com', action:'user_upgrade', target:'charlie@example.com', details:'Pro → Power', timestamp:'2026-05-26 16:20', ip:'192.168.1.1' },
  { id:5, admin:'admin@company.com', action:'refund_issued', target:'diana@example.com', details:'₹499 refunded', timestamp:'2026-05-26 10:05', ip:'192.168.1.1' },
];

const ACTION_BADGE: Record<string,string> = {
  user_upgrade:'badge-indigo', quota_reset:'badge-yellow', user_ban:'badge-red',
  refund_issued:'badge-orange', content_delete:'badge-purple',
};

function fmt(d: Record<string,unknown>|string): string {
  if (typeof d === 'string') return d;
  if (!d) return '';
  if ('oldPlan' in d && 'newPlan' in d) return `${d.oldPlan} → ${d.newPlan}`;
  if ('reason' in d) return String(d.reason);
  return JSON.stringify(d).slice(0, 60);
}

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const url = `/api/audit/logs?limit=100${actionFilter !== 'all' ? `&action=${actionFilter}` : ''}`;
  const { data: logs, reason } = useAdminData<Log[]>(url, DEMO_LOGS, (json) => {
    const arr = (json as { logs?: ApiLog[] }).logs || [];
    return arr.map((l) => ({
      id: l.id, admin: l.adminEmail, action: l.action, target: l.targetUserEmail || '—',
      details: fmt(l.details), timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString() : '—',
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

      <div className="filter-bar">
        <div className="input-group" style={{ width: 280 }}>
          <svg className="input-group-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input" placeholder="Search by admin or target…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <select className="input" style={{ width: 180 }} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="all">All Actions</option>
          <option value="user_upgrade">Plan Upgrade</option>
          <option value="quota_reset">Quota Reset</option>
          <option value="user_ban">User Ban</option>
          <option value="refund_issued">Refund</option>
          <option value="content_delete">Content Delete</option>
        </select>
        <div className="filter-bar-right">
          <button className="btn btn-secondary btn-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
        </div>
      </div>

      <div className="card-flat">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Admin</th><th>Action</th><th>Target</th>
                <th>Details</th><th>Timestamp</th><th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td><span className="font-medium">{log.admin}</span></td>
                  <td><span className={`badge ${ACTION_BADGE[log.action] || 'badge-slate'}`}>{log.action.replace(/_/g,' ')}</span></td>
                  <td className="text-muted">{log.target}</td>
                  <td className="text-muted">{log.details}</td>
                  <td className="font-mono text-muted">{log.timestamp}</td>
                  <td className="font-mono" style={{ color: 'var(--text-dim)' }}>{log.ip}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-text">No audit entries match your filters</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} entries — immutable log
        </div>
      </div>
    </AdminShell>
  );
}
