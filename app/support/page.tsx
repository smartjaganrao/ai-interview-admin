'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';

interface Ticket {
  id: string|number; title: string; user: string;
  status: 'open'|'in-progress'|'resolved'; priority: 'low'|'medium'|'high'|'critical';
  category: string; created: string; assigned: string|null; messageCount: number;
}
interface ApiTicket {
  id: string; userEmail: string; title: string; status: 'open'|'in-progress'|'resolved';
  priority: 'low'|'medium'|'high'|'critical'; category: string; assignedTo: string|null;
  createdAt: number; messageCount: number;
}

const STATUS_BADGE: Record<string,string> = { open:'badge-indigo', 'in-progress':'badge-yellow', resolved:'badge-green' };
const PRIORITY_BADGE: Record<string,string> = { low:'badge-slate', medium:'badge-yellow', high:'badge-orange', critical:'badge-red' };

export default function SupportPage() {
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState<Ticket|null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<''|'sent'|'error'>('');

  const url = `/api/support/tickets?limit=100${filter !== 'all' ? `&status=${filter}` : ''}`;
  const { data: tickets, loading, reason, refetch } = useAdminData<Ticket[]>(url, [], (json) => {
    const arr = (json as { tickets?: ApiTicket[] }).tickets || [];
    return arr.map((t) => ({
      id:t.id, title:t.title, user:t.userEmail||'—', status:t.status, priority:t.priority,
      category:t.category||'other', created: t.createdAt ? new Date(t.createdAt).toISOString().slice(0,10):'—',
      assigned:t.assignedTo, messageCount:t.messageCount,
    }));
  });

  const [changingStatus, setChangingStatus] = useState(false);
  const changeStatus = async (newStatus: string) => {
    if (!active || newStatus === active.status) return;
    setChangingStatus(true);
    const r = await postAdmin(`/api/support/tickets/${active.id}/update`, { status: newStatus });
    setChangingStatus(false);
    if (r.ok) { setActive(null); refetch(); }
    else { setSendStatus('error'); setTimeout(() => setSendStatus(''), 2500); }
  };

  const sendReply = async () => {
    if (!active||!reply.trim()) return;
    setSending(true); setSendStatus('');
    try {
      const res = await fetch(`/api/support/tickets/${active.id}/reply`, {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ message:reply }),
      });
      setSendStatus(res.ok ? 'sent' : 'error');
      if (res.ok) setReply('');
    } catch { setSendStatus('error'); }
    setSending(false);
    setTimeout(() => setSendStatus(''), 2500);
  };

  const counts = {
    open: tickets.filter(t=>t.status==='open').length,
    inProgress: tickets.filter(t=>t.status==='in-progress').length,
    resolved: tickets.filter(t=>t.status==='resolved').length,
    critical: tickets.filter(t=>t.priority==='critical').length,
  };

  return (
    <AdminShell title="Support" subtitle="Customer tickets &amp; issue resolution">
      {loading ? (
        <Loader label="Loading tickets…" />
      ) : reason !== 'live' ? (
        <ErrorState reason={reason} onRetry={refetch} />
      ) : (
        <>
          <span className="live-indicator" style={{ marginBottom: 20 }}>Live data</span>

          <div className="stats-grid" style={{ marginBottom: 20 }}>
            {[
              {label:'Open', value:counts.open}, {label:'In Progress', value:counts.inProgress},
              {label:'Resolved', value:counts.resolved}, {label:'Critical', value:counts.critical},
            ].map((s,i) => (
              <div key={i} className="stat-card"><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
            ))}
          </div>

          <div className="tabs">
            {['all','open','in-progress','resolved'].map((s) => (
              <button key={s} className={`tab${filter===s?' active':''}`} onClick={() => setFilter(s)}>
                {s==='all'?'All Tickets':s.replace('-',' ').replace(/\b\w/g,c=>c.toUpperCase())}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {tickets.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="empty-state-text">No tickets in this view</div></div></div>
            ) : tickets.map((t) => (
              <div key={t.id} className="card" style={{ cursor:'pointer' }} onClick={() => setActive(t)}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <span className="font-semibold">{t.title}</span>
                      <span className={`badge ${PRIORITY_BADGE[t.priority]}`}>{t.priority}</span>
                      <span className="badge badge-slate">{t.category}</span>
                    </div>
                    <div className="text-sm text-muted">From: {t.user} · {t.created} · {t.messageCount} message{t.messageCount===1?'':'s'}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status.replace('-',' ')}</span>
                    <div className="text-sm" style={{ color:'var(--text-dim)', marginTop:4 }}>{t.assigned||'Unassigned'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail drawer */}
      {active && (
        <div className="drawer-overlay" onClick={() => setActive(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">Ticket #{active.id}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setActive(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ fontSize:15 }}>{active.title}</div>
              <div className="flex items-center gap-2">
                <span className={`badge ${STATUS_BADGE[active.status]}`}>{active.status.replace('-',' ')}</span>
                <span className={`badge ${PRIORITY_BADGE[active.priority]}`}>{active.priority}</span>
                <span className="badge badge-slate">{active.category}</span>
              </div>
            </div>
            <div className="text-sm text-muted">From: <span style={{ color:'var(--text)' }}>{active.user}</span></div>
            <div className="divider"/>
            <div className="text-sm text-muted">{active.messageCount} message{active.messageCount===1?'':'s'} in this ticket.</div>

            {/* Status change */}
            <div>
              <div className="text-sm font-semibold mb-2">Set status</div>
              <select
                className="input"
                value={active.status}
                disabled={changingStatus}
                onChange={(e) => changeStatus(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" rows={3} className="input" style={{ resize:'none' }}/>
              <button className="btn btn-primary" onClick={sendReply} disabled={sending||!reply.trim()}>
                {sending?'Sending…':'Send Reply'}
              </button>
              {sendStatus==='sent' && <div className="text-sm text-success">✓ Reply sent</div>}
              {sendStatus==='error' && <div className="text-sm text-danger">⚠ Failed — check admin session</div>}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
