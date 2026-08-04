'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';

interface Announcement { id: string; title: string; body: string; link: string | null; active: boolean; createdAt: number }

export default function AnnouncementsPage() {
  const { data: announcements, loading, reason, refetch } = useAdminData<Announcement[]>(
    '/api/announcements', [],
    (json) => (json as { announcements?: Announcement[] }).announcements || []
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [active, setActive] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok'|'err'; text: string } | null>(null);
  const flash = (kind: 'ok'|'err', text: string) => { setToast({ kind, text }); setTimeout(() => setToast(null), 3500); };

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && announcements.length > 0;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="Announcements" subtitle="What's New — shown to visitors on the landing page"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="Announcements" subtitle="What's New — shown to visitors on the landing page"><Loader label="Loading announcements…" /></AdminShell>;
  }

  const openCreate = () => { setEditing(null); setTitle(''); setBody(''); setLink(''); setActive(true); setShowForm(true); };
  const openEdit = (a: Announcement) => { setEditing(a); setTitle(a.title); setBody(a.body); setLink(a.link || ''); setActive(a.active); setShowForm(true); };

  const save = async () => {
    if (!title.trim() || !body.trim()) return;
    setActing(true);
    const payload = { title, body, link: link.trim() || null, active };
    const r = editing
      ? await (async () => {
          const res = await fetch(`/api/announcements/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, error: data.error };
        })()
      : await postAdmin('/api/announcements', payload);
    setActing(false);
    if (r.ok) { flash('ok', editing ? 'Announcement updated' : 'Announcement created'); setShowForm(false); refetch(); }
    else flash('err', r.error || 'Failed to save');
  };

  const remove = async (a: Announcement) => {
    if (!window.confirm(`Delete announcement "${a.title}"?`)) return;
    const res = await fetch(`/api/announcements/${a.id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) { flash('ok', 'Deleted'); refetch(); }
    else flash('err', 'Failed to delete');
  };

  const toggleActive = async (a: Announcement) => {
    const res = await fetch(`/api/announcements/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ active: !a.active }) });
    if (res.ok) refetch();
  };

  return (
    <AdminShell title="Announcements" subtitle="What's New — shown to visitors on the landing page">
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
        <span className="text-sm text-muted">{announcements.length} announcement{announcements.length === 1 ? '' : 's'}</span>
        <div className="filter-bar-right">
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Announcement</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {announcements.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-text">No announcements yet</div></div></div>
        ) : announcements.map((a) => (
          <div key={a.id} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="font-semibold">{a.title}</span>
                  <span className={`badge ${a.active ? 'badge-green' : 'badge-slate'}`}>{a.active ? 'active' : 'hidden'}</span>
                </div>
                <div className="text-sm text-muted" style={{ marginBottom: 4 }}>{a.body}</div>
                {a.link && <div className="text-sm" style={{ color: 'var(--primary-light)' }}>{a.link}</div>}
                <div className="text-sm text-muted" style={{ marginTop: 4 }}>{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(a)}>{a.active ? 'Hide' : 'Show'}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(a)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="drawer-overlay" onClick={() => setShowForm(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">{editing ? 'Edit Announcement' : 'New Announcement'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Title</label>
            <input className="input mb-3" placeholder="New: HackerRank solver is live" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Body</label>
            <textarea className="input mb-3" rows={3} style={{ resize: 'none' }} placeholder="Short description shown to visitors" value={body} onChange={(e) => setBody(e.target.value)} />
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Link (optional)</label>
            <input className="input mb-3" placeholder="https://javihai.in/pricing" value={link} onChange={(e) => setLink(e.target.value)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13 }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Visible to visitors
            </label>
            <button className="btn btn-primary w-full" disabled={acting || !title.trim() || !body.trim()} onClick={save}>
              {acting ? 'Saving…' : editing ? 'Save Changes' : 'Create Announcement'}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
