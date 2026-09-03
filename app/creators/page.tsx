'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState, RefreshBar } from '@/components/DataStates';

interface Creator {
  id: string;
  code: string;
  name: string;
  email: string;
  status: string;
  commissionBps: number;
  payoutUpi: string;
  referredCount: number;
  totalEarned: number;
  totalPaid: number;
  pending: number;
  createdAt: number;
}

const STATUS_BADGE: Record<string, string> = { active: 'badge-green', suspended: 'badge-red' };
const AVATAR_COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

export default function CreatorsPage() {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Creator | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const { data: creators, loading, reason, refetch, dataUpdatedAt } = useAdminData<Creator[]>(
    '/api/creators/list', [],
    (json) => ((json as { creators?: Creator[] }).creators) || [],
  );

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && creators.length > 0;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="Creators" subtitle="Referral partners, commissions &amp; payouts"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="Creators" subtitle="Referral partners, commissions &amp; payouts"><Loader label="Loading creators…" /></AdminShell>;
  }

  const flash = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = creators.filter((c) => {
    const s = search.toLowerCase();
    return c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s);
  });

  const counts = {
    total: creators.length,
    active: creators.filter((c) => c.status === 'active').length,
    pending: creators.reduce((sum, c) => sum + c.pending, 0),
    paid: creators.reduce((sum, c) => sum + c.totalPaid, 0),
  };

  const recordPayout = async () => {
    if (!detail || !payoutRef.trim()) { flash('err', 'Enter the UPI transaction reference first'); return; }
    setActing(true);
    const r = await postAdmin('/api/creators/payout', { creatorId: detail.id, reference: payoutRef.trim() });
    setActing(false);
    if (r.ok) { flash('ok', r.message || 'Payout recorded'); setDetail(null); setPayoutRef(''); refetch(); }
    else flash('err', r.error || 'Failed to record payout');
  };

  const toggleSuspend = async () => {
    if (!detail) return;
    setActing(true);
    const r = await postAdmin('/api/creators/suspend', { creatorId: detail.id, suspend: detail.status === 'active' });
    setActing(false);
    if (r.ok) { flash('ok', r.message || 'Updated'); setDetail(null); refetch(); }
    else flash('err', r.error || 'Failed');
  };

  return (
    <AdminShell title="Creators" subtitle="Referral partners, commissions &amp; payouts">
      <RefreshBar isLive={reason === 'live'} updatedAt={dataUpdatedAt} onRefresh={refetch} />
      {toast && (
        <div className={`admin-toast ${toast.kind === 'ok' ? 'admin-toast-ok' : 'admin-toast-err'}`}>
          {toast.kind === 'ok' ? '✓' : '⚠'} {toast.text}
        </div>
      )}
      {hasCached && (
        <div className="alert alert-warning" style={{ marginBottom: 20, fontSize: 12 }}>
          Showing cached data. Live data unavailable. <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={refetch}>Retry</button>
        </div>
      )}
      {!hasCached && <span className="live-indicator" style={{ marginBottom: 20 }}>Live data</span>}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Creators', value: counts.total },
          { label: 'Active', value: counts.active },
          { label: 'Pending Payout', value: `₹${counts.pending}` },
          { label: 'Paid Out (lifetime)', value: `₹${counts.paid}` },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="input-group" style={{ width: 300 }}>
          <svg className="input-group-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input" placeholder="Search code, name, email…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <div className="filter-bar-right">
          <button className="btn btn-secondary btn-sm" onClick={refetch}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-flat">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Creator</th><th>UPI</th><th>Referred</th><th>Earned</th><th>Pending</th><th>Status</th><th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar" style={{ background: AVATAR_COLORS[(c.code?.charCodeAt(0) || 65) % AVATAR_COLORS.length] }}>
                        {(c.name || c.code).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{c.code} <span className="text-muted" style={{ fontWeight: 400 }}>· {(c.commissionBps / 100).toFixed(0)}%</span></div>
                        <div className="text-sm text-muted">{c.name || c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>{c.payoutUpi || <span style={{ color: 'var(--danger, #EF4444)' }}>not set</span>}</td>
                  <td>{c.referredCount}</td>
                  <td className="text-muted">₹{c.totalEarned}</td>
                  <td><span style={{ fontWeight: 600, color: c.pending > 0 ? '#10B981' : 'inherit' }}>₹{c.pending}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[c.status] || 'badge-slate'}`}>{c.status}</span></td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => { setDetail(c); setPayoutRef(''); }}>View</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-text">{creators.length === 0 ? 'No creators yet' : 'No creators match your search'}</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {creators.length} creators
        </div>
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="drawer-overlay" onClick={() => setDetail(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">Creator Details</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>{(detail.name || detail.code).charAt(0).toUpperCase()}</div>
              <div className="font-semibold" style={{ fontSize: 15, marginBottom: 2 }}>{detail.code}</div>
              <div className="text-muted text-sm">{detail.name || detail.email}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`badge ${STATUS_BADGE[detail.status] || 'badge-slate'}`}>{detail.status}</span>
                <span className="badge badge-indigo">{(detail.commissionBps / 100).toFixed(0)}% recurring</span>
              </div>
            </div>
            <div className="divider"/>

            {/* Earnings summary */}
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div className="stat-card"><div className="stat-value" style={{ color: '#10B981' }}>₹{detail.pending}</div><div className="stat-label">Pending</div></div>
              <div className="stat-card"><div className="stat-value">{detail.referredCount}</div><div className="stat-label">Referred</div></div>
              <div className="stat-card"><div className="stat-value">₹{detail.totalEarned}</div><div className="stat-label">Earned</div></div>
              <div className="stat-card"><div className="stat-value">₹{detail.totalPaid}</div><div className="stat-label">Paid</div></div>
            </div>

            <div>
              {[
                { label: 'Email', value: detail.email || '—' },
                { label: 'Payout UPI', value: detail.payoutUpi || '⚠ not set' },
                { label: 'Creator ID', value: detail.id },
                { label: 'Joined', value: detail.createdAt ? new Date(detail.createdAt).toISOString().slice(0, 10) : '—' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
                  <span className="text-muted text-sm">{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace', textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="text-sm font-semibold mb-2">Record payout</div>
              <p className="text-muted text-sm" style={{ marginBottom: 8 }}>
                Send ₹{detail.pending} to <strong>{detail.payoutUpi || 'their UPI'}</strong> manually, then paste the transaction reference below to reconcile.
              </p>
              <input
                className="input mb-2" placeholder="UPI transaction reference"
                value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-primary w-full" disabled={acting || detail.pending <= 0 || !payoutRef.trim()} onClick={recordPayout}>
                  {acting ? 'Working…' : `Mark ₹${detail.pending} Paid`}
                </button>
                <button className="btn btn-danger w-full" disabled={acting} onClick={toggleSuspend}>
                  {detail.status === 'active' ? 'Suspend Creator' : 'Reactivate Creator'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
