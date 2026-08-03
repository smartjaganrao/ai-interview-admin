'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';

interface User {
  uid: string; email: string; name: string;
  plan: 'free' | 'quick_pass' | 'pro' | 'power'; status: 'active' | 'inactive' | 'banned';
  joined: string; questions: number;
  phone?: string; experienceLevel?: string; city?: string; referralSource?: string;
  lastActive?: number; activeDays?: number;
  tokensUsed?: number; voiceMinutes?: number; screenshotsUsed?: number; mockSessions?: number;
  duplicateEmail?: boolean;
}
interface ApiUser {
  id: string; email: string; name: string; plan: 'free'|'quick_pass'|'pro'|'power'; status?: string; createdAt: number;
  phone?: string; experienceLevel?: string; city?: string; referralSource?: string;
  lastActive?: number; activeDays?: number;
  tokensUsed?: number; voiceMinutes?: number; screenshotsUsed?: number; mockSessions?: number;
  duplicateEmail?: boolean;
}
interface UserStats { total: number; active: number; paid: number; banned: number; }

function lastActiveLabel(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const PLAN_BADGE: Record<string, string> = { free:'badge-slate', quick_pass:'badge-emerald', pro:'badge-indigo', power:'badge-purple' };
const STATUS_BADGE: Record<string, string> = { active:'badge-green', inactive:'badge-slate', banned:'badge-red' };
const AVATAR_COLORS = ['#6366F1','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4'];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<User | null>(null);

  const { data, loading, reason, refetch } = useAdminData<{ list: User[]; stats: UserStats }>(
    '/api/users/list?limit=100', { list: [], stats: { total: 0, active: 0, paid: 0, banned: 0 } },
    (json) => {
      const j = json as { users?: ApiUser[]; stats?: UserStats };
      const arr = j.users || [];
      return {
        stats: j.stats || { total: arr.length, active: arr.length, paid: 0, banned: 0 },
        list: arr.map((u) => ({
          uid: u.id, email: u.email, name: u.name || u.email?.split('@')[0] || 'User',
          plan: u.plan || 'free', status: (u.status as User['status']) || 'active',
          joined: u.createdAt ? new Date(u.createdAt).toISOString().slice(0,10) : '—',
          questions: 0,
          phone: u.phone, experienceLevel: u.experienceLevel, city: u.city, referralSource: u.referralSource,
          lastActive: u.lastActive, activeDays: u.activeDays,
          tokensUsed: u.tokensUsed, voiceMinutes: u.voiceMinutes, screenshotsUsed: u.screenshotsUsed, mockSessions: u.mockSessions,
          duplicateEmail: u.duplicateEmail,
        })),
      };
    }
  );
  const users = data.list;

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && data.list.length > 0;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="Users" subtitle="Manage accounts, plans &amp; access"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="Users" subtitle="Manage accounts, plans &amp; access"><Loader label="Loading users…" /></AdminShell>;
  }

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      (u.email.toLowerCase().includes(s) || u.name.toLowerCase().includes(s)) &&
      (planFilter === 'all' || u.plan === planFilter) &&
      (statusFilter === 'all' || u.status === statusFilter)
    );
  });

  const toggle = (uid: string) =>
    setSelected((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);
  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map((u) => u.uid));

  const counts = data.stats;

  // ── Mutations ───────────────────────────────────────────────────────────
  const [planChoice, setPlanChoice] = useState('');
  const [acting, setActing] = useState(false);
  const [inlineChanging, setInlineChanging] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const flash = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3000);
  };

  const applyPlan = async () => {
    if (!detail || !planChoice) return;
    setActing(true);
    const r = await postAdmin('/api/users/upgrade', { userId: detail.uid, newPlan: planChoice });
    setActing(false);
    if (r.ok) { flash('ok', r.message || 'Plan updated'); setDetail(null); setPlanChoice(''); refetch(); }
    else flash('err', r.error || 'Failed to change plan');
  };

  const changePlanInline = async (uid: string, newPlan: string) => {
    setInlineChanging(uid);
    const r = await postAdmin('/api/users/upgrade', { userId: uid, newPlan });
    setInlineChanging(null);
    if (r.ok) { flash('ok', `Plan → ${newPlan}`); refetch(); }
    else flash('err', r.error || 'Failed to change plan');
  };

  const toggleBan = async () => {
    if (!detail) return;
    setActing(true);
    const r = await postAdmin('/api/users/ban', { userId: detail.uid, ban: detail.status !== 'banned' });
    setActing(false);
    if (r.ok) { flash('ok', detail.status === 'banned' ? 'User unbanned' : 'User banned'); setDetail(null); refetch(); }
    else flash('err', r.error || 'Failed');
  };

  const resetQuota = async () => {
    if (!detail) return;
    setActing(true);
    const r = await postAdmin('/api/users/reset-quota', { userId: detail.uid });
    setActing(false);
    flash(r.ok ? 'ok' : 'err', r.ok ? (r.message || 'Quota reset') : (r.error || 'Failed'));
  };

  const refundUser = async () => {
    if (!detail) return;
    if (!window.confirm(`Record a refund for ${detail.email}? This downgrades them to Free and claws back any unpaid creator commission. Issue the actual money refund in Razorpay separately.`)) return;
    setActing(true);
    const r = await postAdmin('/api/users/refund', { userId: detail.uid });
    setActing(false);
    if (r.ok) { flash('ok', r.message || 'Refund recorded'); setDetail(null); refetch(); }
    else flash('err', r.error || 'Failed to record refund');
  };

  const bulkSetPlan = async (plan: string) => {
    setActing(true);
    let failed = 0;
    for (const uid of selected) {
      const r = await postAdmin('/api/users/upgrade', { userId: uid, newPlan: plan });
      if (!r.ok) failed++;
    }
    setActing(false);
    const n = selected.length;
    setSelected([]);
    flash(failed === 0 ? 'ok' : 'err',
      failed === 0 ? `Set ${n} user(s) to ${plan}` : `${failed}/${n} failed — check network`);
    refetch();
  };
  const bulkBan = async () => {
    setActing(true);
    let failed = 0;
    for (const uid of selected) {
      const r = await postAdmin('/api/users/ban', { userId: uid, ban: true });
      if (!r.ok) failed++;
    }
    setActing(false);
    const n = selected.length;
    setSelected([]);
    flash(failed === 0 ? 'ok' : 'err',
      failed === 0 ? `Banned ${n} user(s)` : `${failed}/${n} failed`);
    refetch();
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<'idle'|'deleting'|'done'|'err'>('idle');
  const [deleteResult, setDeleteResult] = useState<{ deleted: number; failed: number } | null>(null);

  const deleteUser = async () => {
    if (!detail) return;
    if (!window.confirm(`Permanently delete ${detail.email}? This removes all their data and cannot be undone.`)) return;
    setActing(true);
    const r = await postAdmin('/api/users/delete', { userIds: [detail.uid] });
    setActing(false);
    if (r.ok) { flash('ok', 'User deleted'); setDetail(null); refetch(); }
    else flash('err', r.error || 'Delete failed');
  };

  const bulkDelete = async () => {
    const n = selected.length;
    if (!window.confirm(`Permanently delete ${n} selected user(s)? This cannot be undone.`)) return;
    setActing(true);
    const res = await fetch('/api/users/delete', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ userIds: selected }) });
    const data = await res.json().catch(() => ({}));
    setActing(false);
    setSelected([]);
    flash(res.ok ? 'ok' : 'err', res.ok ? `Deleted ${data.deleted ?? n} user(s)` : (data.error || 'Delete failed'));
    refetch();
  };

  const runDeleteAll = async () => {
    if (deleteAllConfirm !== 'DELETE ALL DATA') return;
    setDeleteStatus('deleting');
    const res = await fetch('/api/users/delete', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ deleteAll: true }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setDeleteStatus('done'); setDeleteResult({ deleted: data.deleted ?? 0, failed: data.failed ?? 0 }); refetch(); }
    else { setDeleteStatus('err'); flash('err', data.error || 'Delete all failed'); setShowDeleteAllModal(false); }
  };

  return (
    <AdminShell title="Users" subtitle="Manage accounts, plans &amp; access">
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
          { label: 'Total Users', value: counts.total },
          { label: 'Active', value: counts.active },
          { label: 'Paid', value: counts.paid },
          { label: 'Banned', value: counts.banned },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="input-group" style={{ width: 280 }}>
          <svg className="input-group-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <select className="input" style={{ width: 130 }} value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="all">All Plans</option><option value="free">Free</option><option value="quick_pass">Quick Pass</option><option value="pro">Pro</option><option value="power">Power</option>
        </select>
        <select className="input" style={{ width: 130 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="banned">Banned</option>
        </select>
        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">{selected.length} selected</span>
            <button className="btn btn-secondary btn-sm" disabled={acting} onClick={() => bulkSetPlan('pro')}>Make Pro</button>
            <button className="btn btn-secondary btn-sm" disabled={acting} onClick={() => bulkSetPlan('power')}>Make Power</button>
            <button className="btn btn-danger btn-sm" disabled={acting} onClick={bulkBan}>Ban</button>
            <button className="btn btn-danger btn-sm" disabled={acting} onClick={bulkDelete}>Delete</button>
          </div>
        )}
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
                <th style={{ width: 32, color: 'var(--text-muted)', fontSize: 11 }}>#</th>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll}/>
                </th>
                <th>User</th><th>Plan</th><th>Status</th><th>Last active</th><th>Active days</th><th>Usage</th><th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => (
                <tr key={u.uid} style={{ cursor: 'pointer' }} onClick={() => { setDetail(u); setPlanChoice(''); }}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{idx + 1}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(u.uid)} onChange={() => toggle(u.uid)}/>
                  </td>
                   <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar" style={{ background: AVATAR_COLORS[(u.name?.charCodeAt(0) || 65) % AVATAR_COLORS.length] }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{u.name}</div>
                          {u.duplicateEmail && (
                            <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full" title="Duplicate email address">
                              ⚠ Duplicate
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="input"
                      style={{ padding: '2px 6px', fontSize: 11, width: 90, opacity: inlineChanging === u.uid ? 0.5 : 1 }}
                      value={u.plan}
                      disabled={inlineChanging === u.uid}
                      onChange={(e) => changePlanInline(u.uid, e.target.value)}
                    >
                      <option value="free">FREE</option>
                      <option value="quick_pass">QUICK PASS</option>
                      <option value="pro">PRO</option>
                      <option value="power">POWER</option>
                    </select>
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[u.status]}`}>{u.status}</span></td>
                  <td>
                    {u.lastActive ? (
                      <span title={new Date(u.lastActive).toLocaleString()}>{lastActiveLabel(u.lastActive)}</span>
                    ) : (
                      <span className="badge badge-red" title="No desktop-app usage recorded">Never used</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.activeDays ? 'badge-indigo' : 'badge-slate'}`} title="Distinct days with desktop-app usage recorded">
                      {u.activeDays ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-muted">
                      {Math.round((u.tokensUsed || 0) / 500)} ans · {(u.voiceMinutes || 0).toFixed(1)}m · {(u.screenshotsUsed || 0)} scr · {(u.mockSessions || 0)} mock
                    </span>
                  </td>
                  <td className="text-muted">{u.joined}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-text">{users.length === 0 ? 'No users yet' : 'No users match your filters'}</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing {filtered.length} of {users.length} users</span>
          <button className="btn btn-danger btn-sm" onClick={() => { setDeleteAllConfirm(''); setDeleteStatus('idle'); setDeleteResult(null); setShowDeleteAllModal(true); }}>
            ⚠ Delete All Users
          </button>
        </div>
      </div>

      {/* Delete All Modal */}
      {showDeleteAllModal && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ width:460, border:'1px solid rgba(248,113,113,0.4)', background:'var(--surface)' }}>
            {deleteStatus === 'done' ? (
              <>
                <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>✅</div>
                <div style={{ fontWeight:700, fontSize:15, textAlign:'center', marginBottom:8 }}>All Users Deleted</div>
                <div className="text-sm text-muted" style={{ textAlign:'center', marginBottom:16 }}>
                  {deleteResult?.deleted ?? 0} deleted · {deleteResult?.failed ?? 0} failed
                </div>
                <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => setShowDeleteAllModal(false)}>Close</button>
              </>
            ) : (
              <>
                <div style={{ fontSize:14, fontWeight:700, color:'#f87171', marginBottom:8 }}>⚠ Delete All Users</div>
                <div className="text-sm text-muted" style={{ lineHeight:1.7, marginBottom:16 }}>
                  Permanently deletes <strong>all {users.length} users</strong> — accounts, subscriptions, usage, referrals, orders, and logs. <strong style={{ color:'#4ade80' }}>Groq API key and pricing config are preserved.</strong> There is no undo.
                </div>
                <div className="text-sm" style={{ marginBottom:8, fontWeight:600 }}>
                  Type <code style={{ color:'#f87171' }}>DELETE ALL DATA</code> to confirm:
                </div>
                <input
                  className="input"
                  placeholder="DELETE ALL DATA"
                  value={deleteAllConfirm}
                  onChange={e => setDeleteAllConfirm(e.target.value)}
                  style={{ marginBottom:16, borderColor: deleteAllConfirm === 'DELETE ALL DATA' ? '#f87171' : undefined }}
                  autoFocus
                />
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn" style={{ flex:1 }} disabled={deleteStatus === 'deleting'} onClick={() => setShowDeleteAllModal(false)}>Cancel</button>
                  <button
                    className="btn"
                    style={{ flex:1, background:'rgba(248,113,113,0.2)', color:'#f87171', border:'1px solid rgba(248,113,113,0.5)' }}
                    disabled={deleteAllConfirm !== 'DELETE ALL DATA' || deleteStatus === 'deleting'}
                    onClick={runDeleteAll}
                  >
                    {deleteStatus === 'deleting' ? 'Deleting…' : 'Delete All Users'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="drawer-overlay" onClick={() => setDetail(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">User Details</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>{detail.name.charAt(0).toUpperCase()}</div>
              <div className="font-semibold" style={{ fontSize: 15, marginBottom: 2 }}>{detail.name}</div>
              <div className="text-muted text-sm">{detail.email}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`badge ${PLAN_BADGE[detail.plan]}`}>{detail.plan.toUpperCase()}</span>
                <span className={`badge ${STATUS_BADGE[detail.status]}`}>{detail.status}</span>
              </div>
            </div>
            <div className="divider"/>
            <div>
              {[
                { label: 'User ID', value: detail.uid },
                { label: 'Member Since', value: detail.joined },
                { label: 'Last Active (app)', value: detail.lastActive ? `${lastActiveLabel(detail.lastActive)} (${new Date(detail.lastActive).toLocaleDateString()})` : 'Never used the app' },
                { label: 'Active Days', value: String(detail.activeDays ?? 0) },
                { label: 'Mobile Number', value: detail.phone || '—' },
                { label: 'Experience Level', value: detail.experienceLevel || '—' },
                { label: 'City', value: detail.city || '—' },
                { label: 'Heard About Us Via', value: detail.referralSource || '—' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-muted text-sm">{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Actions</div>
              <select className="input mb-2" value={planChoice} onChange={(e) => setPlanChoice(e.target.value)}>
                <option value="">Change Plan…</option>
                <option value="free">Free</option>
                <option value="quick_pass">Quick Pass</option>
                <option value="pro">Pro</option>
                <option value="power">Power</option>
              </select>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-primary w-full" disabled={acting || !planChoice} onClick={applyPlan}>
                  {acting ? 'Working…' : 'Apply Plan Change'}
                </button>
                <button className="btn btn-secondary w-full" disabled={acting} onClick={resetQuota}>Reset Usage Quota</button>
                <button className="btn btn-secondary w-full" disabled={acting} onClick={refundUser}>Record Refund &amp; Downgrade</button>
                <button className="btn btn-danger w-full" disabled={acting} onClick={toggleBan}>
                  {detail.status === 'banned' ? 'Unban User' : 'Ban User'}
                </button>
                <button className="btn w-full" disabled={acting} onClick={deleteUser}
                  style={{ background:'rgba(248,113,113,0.15)', color:'#f87171', border:'1px solid rgba(248,113,113,0.4)' }}>
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
