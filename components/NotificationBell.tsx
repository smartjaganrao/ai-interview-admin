'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: 'ticket' | 'signup' | 'payment' | 'refund' | 'creator';
  title: string;
  subtitle: string;
  timestamp: number;
  href: string;
}

const NOTIF_ICON: Record<NotificationItem['type'], string> = {
  ticket: '🎫', signup: '👤', payment: '💳', refund: '↩️', creator: '⭐',
};

function relativeTime(ts: number): string {
  if (!ts) return '';
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function IconBell() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pending, setPending] = useState<{ total: number; count: number }>({ total: 0, count: 0 });

  const load = () => {
    fetch('/api/notifications', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setItems(d.items || []);
        setUnreadCount(d.unreadCount || 0);
        setPending({ total: d.pendingPayoutTotal || 0, count: d.pendingPayoutCount || 0 });
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      fetch('/api/notifications/mark-read', { method: 'POST', credentials: 'include' }).then(() => setUnreadCount(0));
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button className="topbar-btn" aria-label="Notifications" onClick={toggleOpen}>
        <IconBell />
        {unreadCount > 0 && <span className="topbar-badge" />}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: '120%', width: 340, maxHeight: 420, overflowY: 'auto',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)', zIndex: 91,
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
              Notifications
            </div>
            {pending.count > 0 && (
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', background: 'rgba(16,185,129,0.08)' }}>
                💰 ₹{pending.total} pending payout across {pending.count} creator{pending.count === 1 ? '' : 's'}
              </div>
            )}
            {items.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No recent activity</div>
            ) : items.map((it) => (
              <div
                key={it.id}
                onClick={() => { setOpen(false); router.push(it.href); }}
                style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{NOTIF_ICON[it.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{it.title}</div>
                  {it.subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.subtitle}</div>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{relativeTime(it.timestamp)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}