'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import PromotionEditor from '@/components/PromotionEditor';
import EmailTemplateGenerator from '@/components/EmailTemplateGenerator';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';

type Segment = 'active7' | 'active30' | 'dormant' | 'never';

interface AdoptionUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  createdAt: number;
  lastActive: number;
  activeDays: number;
  tokensUsed: number;
  voiceMinutes: number;
  screenshotsUsed: number;
  mockSessions: number;
  segment: Segment;
}

interface AdoptionData {
  totalUsers: number;
  activated: number;
  activationRate: number;
  counts: Record<Segment, number>;
  users: AdoptionUser[];
}

const SEGMENTS: Array<{ id: Segment; label: string; hint: string; badge: string }> = [
  { id: 'active7',  label: 'Active (7d)',     hint: 'Used the app in the last 7 days',       badge: 'badge-green' },
  { id: 'active30', label: 'Active (30d)',    hint: 'Used in the last 30 days, not last 7',  badge: 'badge-indigo' },
  { id: 'dormant',  label: 'Dormant',         hint: 'Activated once, idle 30+ days',         badge: 'badge-yellow' },
  { id: 'never',    label: 'Never activated', hint: 'Signed up, never used the desktop app', badge: 'badge-red' },
];

function relativeActive(ts: number): string {
  if (!ts) return 'never';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function AdoptionPage() {
  const { data, loading, reason, refetch } = useAdminData<AdoptionData>(
    '/api/analytics/adoption',
    { totalUsers: 0, activated: 0, activationRate: 0, counts: { active7: 0, active30: 0, dormant: 0, never: 0 }, users: [] },
    (json) => json as AdoptionData
  );

  const [filter, setFilter] = useState<Segment | 'all'>('all');
  const [reengageSeg, setReengageSeg] = useState<Segment | null>(null);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplateGen, setShowTemplateGen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const flash = (kind: 'ok' | 'err', text: string) => { setToast({ kind, text }); setTimeout(() => setToast(null), 4500); };

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && data.users.length > 0;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="App Usage" subtitle="Who has activated and is actually using the desktop app"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="App Usage" subtitle="Who has activated and is actually using the desktop app"><Loader label="Loading adoption data…" /></AdminShell>;
  }

  const shown = filter === 'all' ? data.users : data.users.filter((u) => u.segment === filter);

  const openReengage = (seg: Segment) => {
    setReengageSeg(seg);
    setSubject('');
    setHtml('<p>Hi there,</p><p></p><p></p>');
  };

  const reengageUsers = reengageSeg ? data.users.filter((u) => u.segment === reengageSeg && u.email) : [];

  const sendReengage = async () => {
    if (!subject.trim() || !html.trim()) { flash('err', 'Subject and content are required'); return; }
    if (reengageUsers.length === 0) { flash('err', 'No emailable users in this segment'); return; }
    if (!window.confirm(`Email ${reengageUsers.length} ${reengageSeg} user${reengageUsers.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    setSending(true);
    const r = await postAdmin('/api/promotions/send', {
      subject, html, confirm: true, userIds: reengageUsers.map((u) => u.id),
    });
    setSending(false);
    if (r.ok) { flash('ok', `Re-engagement email sent to ${reengageUsers.length} users`); setReengageSeg(null); }
    else flash('err', r.error || 'Failed to send');
  };

  return (
    <AdminShell title="App Usage" subtitle="Who has activated and is actually using the desktop app">
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
      {/* Activation summary */}
      <div className="card mb-3">
        <div className="card-header">
          <div>
            <div className="card-title">Activation</div>
            <div className="card-subtitle">{data.activated} of {data.totalUsers} users have used the app</div>
          </div>
          <span className={`badge ${data.activationRate >= 50 ? 'badge-green' : data.activationRate >= 25 ? 'badge-yellow' : 'badge-red'}`}>
            {data.activationRate}% activated
          </span>
        </div>
      </div>

      {/* Segment cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
        {SEGMENTS.map((s) => (
          <div
            key={s.id}
            className="card"
            style={{ cursor: 'pointer', outline: filter === s.id ? '2px solid var(--primary)' : 'none' }}
            onClick={() => setFilter(filter === s.id ? 'all' : s.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className={`badge ${s.badge}`}>{s.label}</span>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{data.counts[s.id]}</span>
            </div>
            <div className="text-sm text-muted" style={{ lineHeight: 1.5 }}>{s.hint}</div>
            {(s.id === 'dormant' || s.id === 'never') && data.counts[s.id] > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 10 }}
                onClick={(e) => { e.stopPropagation(); openReengage(s.id); }}
              >
                ✉ Email these {data.counts[s.id]}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* User list */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Users {filter !== 'all' && `· ${SEGMENTS.find((s) => s.id === filter)?.label}`}</div>
          {filter !== 'all' && <button className="btn btn-ghost btn-sm" onClick={() => setFilter('all')}>Clear filter</button>}
        </div>
        {shown.length === 0 ? (
          <div className="empty-state"><div className="empty-state-text">No users in this segment</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {shown.map((u) => {
              const seg = SEGMENTS.find((s) => s.id === u.segment)!;
              return (
                <div key={u.id} className="card-flat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-semibold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.name || u.email || u.id}
                    </div>
                    <div className="text-sm text-muted">{u.email} · {u.plan}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span className="text-sm text-muted">{u.activeDays > 0 ? `${u.activeDays}d` : '—'}</span>
                    <span className="badge badge-slate">{Math.round((u.tokensUsed || 0) / 500)} answers</span>
                    {(u.voiceMinutes || 0) > 0 && <span className="badge badge-slate">🎤 {Math.round(u.voiceMinutes)}m</span>}
                    {(u.screenshotsUsed || 0) > 0 && <span className="badge badge-slate">📸 {u.screenshotsUsed}</span>}
                    {(u.mockSessions || 0) > 0 && <span className="badge badge-slate">🎯 {u.mockSessions}</span>}
                    <span className="text-sm text-muted" style={{ width: 80, textAlign: 'right' }}>{relativeActive(u.lastActive)}</span>
                    <span className={`badge ${seg.badge}`}>{seg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Re-engagement compose drawer */}
      {reengageSeg && (
        <div className="drawer-overlay" onClick={() => setReengageSeg(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="drawer-header">
              <div className="drawer-title">Re-engage {reengageSeg} users ({reengageUsers.length})</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setReengageSeg(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {showTemplateGen && (
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                <EmailTemplateGenerator
                  onTemplateGenerated={(subject, html) => {
                    setSubject(subject);
                    setHtml(html);
                    setShowTemplateGen(false);
                  }}
                />
              </div>
            )}

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Subject</label>
            <input className="input mb-3" placeholder="We miss you — here's what's new" value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Message</label>
            <PromotionEditor html={html} onChange={setHtml} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-secondary" onClick={() => setShowTemplateGen(!showTemplateGen)} disabled={sending}>
                {showTemplateGen ? '✕' : '✨'} Template
              </button>
              <button className="btn btn-secondary" onClick={() => setReengageSeg(null)} disabled={sending}>Cancel</button>
              <button className="btn btn-primary" onClick={sendReengage} disabled={sending}>
                {sending ? 'Sending…' : `Send to ${reengageUsers.length} users`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
