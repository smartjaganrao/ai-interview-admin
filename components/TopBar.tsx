'use client';

import NotificationBell from './NotificationBell';

export default function TopBar({
  title,
  subtitle,
  extraActions,
  onMobileMenu,
}: {
  title: string;
  subtitle?: string;
  extraActions?: React.ReactNode;
  onMobileMenu: () => void;
}) {
  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <button
          onClick={onMobileMenu}
          className="topbar-hamburger btn btn-ghost btn-icon"
          aria-label="Open menu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
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
        {extraActions}
        <NotificationBell />
        <span className="status-dot">Operational</span>
      </div>
    </header>
  );
}