'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData, dataSourceLabel } from '@/lib/useAdminData';

interface Ticket {
  id: string|number; title: string; user: string;
  status: 'open'|'in-progress'|'resolved'; priority: 'low'|'medium'|'high'|'critical';
  category: string; created: string; assigned: string|null; messageCount: number;
  messages?: { from:'user'|'admin'; text: string; time: string }[];
}
interface ApiTicket {
  id: string; userEmail: string; title: string; status: 'open'|'in-progress'|'resolved';
  priority: 'low'|'medium'|'high'|'critical'; category: string; assignedTo: string|null;
  createdAt: number; messageCount: number;
}

const DEMO: Ticket[] = [
  { id:1, title:'Cannot login with Google', user:'alice@example.com', status:'open', priority:'high', category:'technical', created:'2026-05-27', assigned:null, messageCount:1,
    messages:[{from:'user',text:"When I click Google sign-in nothing happens.",time:'2h ago'}] },
  { id:2, title:'Feature request: light mode', user:'bob@example.com', status:'open', priority:'low', category:'feature-request', created:'2026-05-26', assigned:null, messageCount:1,
    messages:[{from:'user',text:"Would love a light theme option.",time:'1d ago'}] },
  { id:3, title:'Billing issue — double charge', user:'charlie@example.com', status:'in-progress', priority:'critical', category:'billing', created:'2026-05-25', assigned:'admin@company.com', messageCount:2,
    messages:[{from:'user',text:"I was charged twice for Pro.",time:'2d ago'},{from:'admin',text:"Looking into this now.",time:'1d ago'}] },
  { id:4, title:'Need refund for March', user:'diana@example.com', status:'resolved', priority:'medium', category:'billing', created:'2026-05-20', assigned:'admin@company.com', messageCount:2,
    messages:[{from:'user',text:"Please refund March.",time:'7d ago'},{from:'admin',text:"Refunded ✓",time:'6d ago'}] },
];

const STATUS_BADGE: Record<string,string> = { open:'badge-indigo', 'in-progress':'badge-yellow', resolved:'badge-green' };
const PRIORITY_BADGE: Record<string,string> = { low:'badge-slate', medium:'badge-yellow', high:'badge-orange', critical:'badge-red' };

export default function SupportPage() {
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState<Ticket|null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<''|'sent'|'error'>('');

  const url = `/api/support/tickets?limit=100${filter !== 'all' ? `&status=${filter}` : ''}`;
  const { data: tickets, reason, isLive } = useAdminData<Ticket[]>(url, DEMO, (json) => {
    const arr = (json as { tickets?: ApiTicket[] }).tickets || [];
    return arr.map((t) => ({
      id:t.id, title:t.title, user:t.userEmail||'—', status:t.status, priority:t.priority,
      category:t.category||'other', created: t.createdAt ? new Date(t.createdAt).toISOString().slice(0,10):'—',
      assigned:t.assignedTo, messageCount:t.messageCount,
    }));
  });
  const badge = dataSourceLabel(reason);

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
    <AdminShell title="Support">
      <div className="mb-4">
        <span className={`badge ${badge.className}`}>{badge.text}</span>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          {label:'Open', value:counts.open}, {label:'In Progress', value:counts.inProgress},
          {label:'Resolved', value:counts.resolved}, {label:'Critical', value:counts.critical},
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="tabs">
        {['all','open','in-progress','resolved'].map((s) => (
          <button key={s} className={`tab${filter===s?' active':''}`} onClick={() => setFilter(s)}>
            {s==='all'?'All Tickets':s.replace('-',' ').replace(/\b\w/g,c=>c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {tickets.length === 0 && <div className="card"><div className="empty-state"><div className="empty-state-text">No tickets in this view</div></div></div>}
        {tickets.map((t) => (
          <div key={t.id} className="card" style={{ cursor:'pointer', transition:'border-color 0.15s' }}
            onClick={() => setActive(t)}>
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

            {/* Thread */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {active.messages?.length ? active.messages.map((m,i) => (
                <div key={i} style={{ padding:'10px 12px', borderRadius:8, background: m.from==='admin' ? 'rgba(99,102,241,0.08)' : 'var(--surface-2)', marginLeft: m.from==='admin'?32:0, marginRight: m.from==='admin'?0:32 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{m.from==='admin'?'Admin':active.user}</span>
                    <span className="text-sm" style={{ color:'var(--text-dim)' }}>{m.time}</span>
                  </div>
                  <div style={{ fontSize:13 }}>{m.text}</div>
                </div>
              )) : (
                <div className="text-sm text-muted" style={{ padding:'12px 0' }}>
                  {isLive ? `${active.messageCount} messages — open ticket to view thread` : 'No messages yet.'}
                </div>
              )}
            </div>

            {/* Reply */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…"
                rows={3} className="input" style={{ resize:'none' }}/>
              <div className="flex items-center gap-2">
                <button className="btn btn-primary flex-1" onClick={sendReply} disabled={sending||!reply.trim()}>
                  {sending?'Sending…':'Send Reply'}
                </button>
                <select className="input" style={{ width:140 }}>
                  <option>Mark as…</option>
                  <option>Open</option><option>In Progress</option><option>Resolved</option>
                </select>
              </div>
              {sendStatus==='sent' && <div className="text-sm text-success">✓ Reply sent</div>}
              {sendStatus==='error' && <div className="text-sm text-danger">⚠ Failed — check admin session</div>}
              <button className="btn btn-secondary w-full">Assign to Me</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
