'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';

interface Admin { uid: string; email: string; role: 'super-admin'|'admin'|'moderator'|'analyst'; createdAt: number | null }

const ROLE_BADGE: Record<string, string> = { 'super-admin':'badge-purple', admin:'badge-indigo', moderator:'badge-slate', analyst:'badge-slate' };
const ROLES: Admin['role'][] = ['super-admin', 'admin', 'moderator', 'analyst'];

export default function AdminsPage() {
  const { data: admins, loading, reason, refetch } = useAdminData<Admin[]>(
    '/api/admins', [],
    (json) => (json as { admins?: Admin[] }).admins || []
  );

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && admins.length > 0;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="Admins" subtitle="Manage who has access to this panel"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="Admins" subtitle="Manage who has access to this panel"><Loader label="Loading admins…" /></AdminShell>;
  }

  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Admin['role']>('admin');
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const flash = (kind: 'ok' | 'err', text: string) => { setToast({ kind, text }); setTimeout(() => setToast(null), 3500); };

  const addAdmin = async () => {
    if (!newEmail.trim()) return;
    setActing(true);
    const r = await postAdmin('/api/admins', { email: newEmail.trim(), role: newRole });
    setActing(false);
    if (r.ok) { flash('ok', r.message || 'Admin added'); setShowAdd(false); setNewEmail(''); setNewRole('admin'); refetch(); }
    else flash('err', r.error || 'Failed to add admin');
  };

  const changeRole = async (uid: string, role: Admin['role']) => {
    setActing(true);
    const res = await fetch('/api/admins', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ uid, role }) });
    const data = await res.json().catch(() => ({}));
    setActing(false);
    flash(res.ok ? 'ok' : 'err', res.ok ? 'Role updated' : (data.error || 'Failed'));
    refetch();
  };

  const revoke = async (a: Admin) => {
    if (!window.confirm(`Revoke admin access for ${a.email}? They will no longer be able to sign in to the admin panel.`)) return;
    setActing(true);
    const res = await fetch('/api/admins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ uid: a.uid }) });
    const data = await res.json().catch(() => ({}));
    setActing(false);
    flash(res.ok ? 'ok' : 'err', res.ok ? 'Admin access revoked' : (data.error || 'Failed'));
    refetch();
  };

  return (
    <AdminShell title="Admins" subtitle="Manage who has access to this panel">
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
      <div className="filter-bar">
        <span className="text-sm text-muted">{admins.length} admin{admins.length === 1 ? '' : 's'}</span>
        <div className="filter-bar-right">
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Admin</button>
        </div>
      </div>

      <div className="card-flat">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Added</th><th style={{ width: 220 }}>Actions</th></tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.uid}>
                  <td className="font-medium">{a.email}</td>
                  <td><span className={`badge ${ROLE_BADGE[a.role]}`}>{a.role}</span></td>
                  <td className="text-muted">{a.createdAt ? new Date(a.createdAt).toISOString().slice(0,10) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="input" style={{ width: 130, height: 32, fontSize: 12 }} value={a.role} disabled={acting}
                        onChange={(e) => changeRole(a.uid, e.target.value as Admin['role'])}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button className="btn btn-danger btn-sm" disabled={acting} onClick={() => revoke(a)}>Revoke</button>
                    </div>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan={4}><div className="empty-state"><div className="empty-state-text">No admins found</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">Add Admin</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="text-sm text-muted" style={{ marginBottom: 16, lineHeight: 1.6 }}>
              The person must already have a Firebase account — ask them to sign in once at the admin panel first (it will be denied with &quot;You do not have admin access&quot;), then add them here.
            </div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Email</label>
            <input className="input mb-3" placeholder="teammate@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoFocus />
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Role</label>
            <select className="input mb-4" value={newRole} onChange={(e) => setNewRole(e.target.value as Admin['role'])}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn btn-primary w-full" disabled={acting || !newEmail.trim()} onClick={addAdmin}>
              {acting ? 'Adding…' : 'Add Admin'}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
