'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { Loader, ErrorState } from '@/components/DataStates';

interface Log {
  id: string|number; admin: string; action: string; target: string;
  details: string; timestamp: string; ip: string;
}
interface ApiLog {
  id: string; adminEmail: string; action: string; targetUserEmail: string;
  details: Record<string,unknown>|string; timestamp: number; ipAddress: string;
}

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
  const { data: logs, loading, reason, refetch } = useAdminData<Log[]>(url, [], (json) => {
    const arr = (json as { logs?: ApiLog[] }).logs || [];
    return arr.map((l) => ({
      id: l.id, admin: l.adminEmail, action: l.action, target: l.targetUserEmail || '—',
      details: fmt(l.details), timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString() : '—',
      ip: l.ipAddress || '—',
    }));
  });

  const filtered = logs.filter((l) => {
    const s = search.toLowerCase();
    return l.target.toLowerCase().includes(s) || l.admin.toLowerCase().includes(s);
  });

  return (
    <AdminShell title="Audit Logs" subtitle="Immutable record of all admin actions">
      {loading ? (
        <Loader label="Loading audit logs…" />
      ) : reason !== 'live' ? (
        <ErrorState reason={reason} onRetry={refetch} />
      ) : (
        <>
          <span className="live-indicator" style={{ marginBottom: 20 }}>Live data</span>

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
              <button className="btn btn-secondary btn-sm" onClick={refetch}>Refresh</button>
            </div>
          </div>

          <div className="card-flat">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Admin</th><th>Action</th><th>Target</th><th>Details</th><th>Timestamp</th><th>IP Address</th></tr>
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
                    <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-text">{logs.length === 0 ? 'No audit entries yet' : 'No entries match your filters'}</div></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
              {filtered.length} entries — immutable log
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
