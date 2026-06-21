'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { logout } from '@/lib/firebase-client';

// ── Icons ──────────────────────────────────────────────────────────────────
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconAnalytics = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconCreators = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const IconPricing = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const IconAudit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconSupport = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconAnnouncements = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l18-5v12L3 14v-3z"/>
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
  </svg>
);
const IconAdmins = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconSignOut = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconMenu = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconBell = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

// ── Nav structure ──────────────────────────────────────────────────────────
const NAV_SECTIONS: Array<{
  label?: string;
  items: Array<{ label: string; href: string; icon: React.ReactNode }>;
}> = [
  {
    items: [{ label: 'Dashboard', href: '/', icon: <IconDashboard /> }],
  },
  {
    label: 'Users',
    items: [
      { label: 'Users', href: '/users', icon: <IconUsers /> },
      { label: 'Analytics', href: '/analytics', icon: <IconAnalytics /> },
    ],
  },
  {
    label: 'Monetize',
    items: [
      { label: 'Creators', href: '/creators', icon: <IconCreators /> },
      { label: 'Pricing', href: '/pricing', icon: <IconPricing /> },
      { label: 'Announcements', href: '/announcements', icon: <IconAnnouncements /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Audit Logs', href: '/audit', icon: <IconAudit /> },
      { label: 'Support', href: '/support', icon: <IconSupport /> },
      { label: 'Admins', href: '/admins', icon: <IconAdmins /> },
    ],
  },
];

// Settings sits below a divider, apart from the main sections
const BOTTOM_NAV = { label: 'Settings', href: '/settings', icon: <IconSettings /> };

// ── Notification bell ───────────────────────────────────────────────────────
interface NotificationItem {
  id: string; type: 'ticket'|'signup'|'payment'|'refund'|'creator';
  title: string; subtitle: string; timestamp: number; href: string;
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

function NotificationBell() {
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

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    try {
      const cookie = document.cookie.split('; ').find((r) => r.startsWith('admin-session='));
      if (cookie) {
        const session = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
        setAdminEmail(session?.email || '');
      }
    } catch { /* ignore */ }
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Logo */}
      <Link href="/" onClick={onNavigate} className="sidebar-logo">
        <img
          src="/logo.svg"
          alt="JavihAI"
          style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 6 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">JavihAI</div>
          <div className="sidebar-logo-sub">Admin Console</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {si > 0 && section.label && (
              <div className="sidebar-section-label">{section.label}</div>
            )}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`nav-item${isActive(item.href) ? ' active' : ''}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}

        {/* Settings below a divider */}
        <div className="sidebar-divider" style={{ marginTop: 12 }} />
        <Link
          href={BOTTOM_NAV.href}
          onClick={onNavigate}
          className={`nav-item${isActive(BOTTOM_NAV.href) ? ' active' : ''}`}
        >
          <span className="nav-item-icon">{BOTTOM_NAV.icon}</span>
          {BOTTOM_NAV.label}
        </Link>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {adminEmail ? adminEmail.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Admin</div>
            <div className="sidebar-user-email">{adminEmail || 'admin'}</div>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); router.push('/login'); }}
          className="btn btn-ghost w-full"
          style={{ justifyContent: 'flex-start', fontSize: '12px', padding: '6px 8px' }}
        >
          <IconSignOut />
          Sign Out
        </button>
      </div>
    </>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────
export default function AdminShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout">
      {/* Desktop sidebar */}
      <aside className="admin-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className="admin-sidebar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              onClick={() => setMobileOpen(true)}
              className="topbar-hamburger btn btn-ghost btn-icon"
              aria-label="Open menu"
            >
              <IconMenu />
            </button>
            <div>
              <h1 className="topbar-title">{title}</h1>
              {subtitle && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div className="topbar-right">
            <NotificationBell />
            <span className="status-dot">Operational</span>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content animate-in">
          {children}
        </main>
      </div>
    </div>
  );
}
