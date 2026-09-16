'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { Loader, ErrorState, RefreshBar } from '@/components/DataStates';

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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirm, setClearConfirm] = useState('');
  const [clearStatus, setClearStatus] = useState<'idle'|'deleting'|'done'>('idle');

  const url = `/api/audit/logs?page=${page}&limit=${limit}${actionFilter !== 'all' ? `&action=${actionFilter}` : ''}&admin=${encodeURIComponent(search.trim())}`;
  const { data, loading, reason, refetch, dataUpdatedAt } = useAdminData<{
    logs: Log[];
    total: number;
    totalPages: number;
  }>(url, { logs: [], total: 0, totalPages: 1 }, (json) => {
    const j = json as { logs?: ApiLog[]; total?: number; totalPages?: number };
    const arr = j.logs || [];
    return {
      total: j.total ?? arr.length,
      totalPages: j.totalPages ?? 1,
      logs: arr.map((l) => ({
        id: l.id, admin: l.adminEmail, action: l.action, target: l.targetUserEmail || '—',
        details: fmt(l.details), timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString() : '—',
        ip: l.ipAddress || '—',
      })),
    };
  });

  const logs = data.logs;
  const totalLogs = data.total;
  const totalPages = data.totalPages || Math.ceil(totalLogs / limit) || 1;
  const startIdx = totalLogs > 0 ? (page - 1) * limit + 1 : 0;
  const endIdx = Math.min(page * limit, totalLogs);

  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };
  const handleActionFilterChange = (val: string) => { setActionFilter(val); setPage(1); };
  const handleLimitChange = (val: number) => { setLimit(val); setPage(1); };

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && logs.length > 0;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="Audit Logs" subtitle="Record of all admin actions"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="Audit Logs" subtitle="Record of all admin actions"><Loader label="Loading audit logs…" /></AdminShell>;
  }

  const deleteLog = async (id: string | number) => {
    if (!window.confirm('Delete this audit entry?')) return;
    setDeleting(String(id));
    await fetch('/api/audit/logs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ logId: String(id) }),
    });
    setDeleting(null);
    refetch();
  };

  const clearAll = async () => {
    if (clearConfirm !== 'CLEAR ALL') return;
    setClearStatus('deleting');
    await fetch('/api/audit/logs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ deleteAll: true }),
    });
    setClearStatus('done');
    setTimeout(() => {
      setShowClearModal(false);
      setClearConfirm('');
      setClearStatus('idle');
      refetch();
    }, 1000);
  };

  return (
    <AdminShell title="Audit Logs" subtitle="Record of all admin actions">
      <RefreshBar isLive={reason === 'live'} updatedAt={dataUpdatedAt} onRefresh={refetch} />
      {/* Clear All modal */}
      {showClearModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ maxWidth:440, width:'90%' }}>
            <div className="font-semibold mb-2" style={{ color:'var(--error)', fontSize:16 }}>⚠ Clear All Audit Logs</div>
            <p className="text-sm text-muted mb-4">This permanently deletes all audit log entries (up to 500 at a time). This cannot be undone.</p>
            <p className="text-sm mb-2">Type <strong>CLEAR ALL</strong> to confirm:</p>
            <input className="input mb-4" value={clearConfirm} onChange={e => setClearConfirm(e.target.value)} placeholder="CLEAR ALL" autoFocus />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowClearModal(false); setClearConfirm(''); }}>Cancel</button>
              <button className="btn btn-sm" style={{ background:'var(--error)', color:'#fff' }}
                disabled={clearConfirm !== 'CLEAR ALL' || clearStatus === 'deleting'}
                onClick={clearAll}>
                {clearStatus === 'deleting' ? 'Clearing…' : clearStatus === 'done' ? 'Done ✓' : 'Clear All Logs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {hasCached && (
        <div className="alert alert-warning" style={{ marginBottom: 20, fontSize: 12 }}>
          Showing cached data. Live data unavailable. <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={refetch}>Retry</button>
        </div>
      )}
      {!hasCached && <span className="live-indicator" style={{ marginBottom: 20 }}>Live data</span>}

      <div className="filter-bar">
        <div className="input-group" style={{ width: 280 }}>
          <svg className="input-group-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input" placeholder="Search by admin or target…" value={search} onChange={(e) => handleSearchChange(e.target.value)}/>
        </div>
        <select className="input" style={{ width: 180 }} value={actionFilter} onChange={(e) => handleActionFilterChange(e.target.value)}>
          <option value="all">All Actions</option>
          <option value="user_upgrade">Plan Upgrade</option>
          <option value="quota_reset">Quota Reset</option>
          <option value="user_ban">User Ban</option>
          <option value="refund_issued">Refund</option>
          <option value="content_delete">Content Delete</option>
        </select>
        <div className="filter-bar-right">
          <button className="btn btn-secondary btn-sm" onClick={refetch}>Refresh</button>
          <button className="btn btn-sm" style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)' }}
            onClick={() => setShowClearModal(true)}>
            🗑 Clear All
          </button>
        </div>
      </div>

      <div className="card-flat">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Admin</th><th>Action</th><th>Target</th><th>Details</th><th>Timestamp</th><th>IP Address</th><th></th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td><span className="font-medium">{log.admin}</span></td>
                  <td><span className={`badge ${ACTION_BADGE[log.action] || 'badge-slate'}`}>{log.action.replace(/_/g,' ')}</span></td>
                  <td className="text-muted">{log.target}</td>
                  <td className="text-muted">{log.details}</td>
                  <td className="font-mono text-muted">{log.timestamp}</td>
                  <td className="font-mono" style={{ color: 'var(--text-dim)' }}>{log.ip}</td>
                  <td>
                    <button
                      className="btn btn-sm"
                      style={{ background:'rgba(239,68,68,0.1)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)', padding:'2px 8px', fontSize:11 }}
                      disabled={deleting === String(log.id)}
                      onClick={() => deleteLog(log.id)}
                    >
                      {deleting === String(log.id) ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-text">No audit entries match your filters</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{totalLogs}</strong> logs
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Per page:</span>
              <select
                className="input"
                style={{ padding: '2px 6px', fontSize: 12, width: 64 }}
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              title="First Page"
            >
              « First
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
            >
              ‹ Prev
            </button>

            <span style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 4px' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              Next ›
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              title="Last Page"
            >
              Last »
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
