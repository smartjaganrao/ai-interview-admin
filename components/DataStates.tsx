'use client';

import { useEffect, useState } from 'react';
import { errorMessage, type Reason } from '@/lib/useAdminData';

/** "3m ago" / "2h ago" / "5d ago" — shared by every page's RefreshBar. */
export function relTime(ts: number): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * Standard header row for every admin page backed by useAdminData: a "Live
 * data" badge (only when isLive — omitted entirely otherwise, per "if not
 * live data not there"), a "Refresh" button, and a "Updated Xs/m/h ago"
 * timestamp from the same query's dataUpdatedAt. Re-renders the timestamp
 * every 15s on its own so "just now" ages without needing a refetch.
 */
export function RefreshBar({
  isLive,
  updatedAt,
  onRefresh,
}: {
  isLive: boolean;
  updatedAt: number;
  onRefresh: () => void | Promise<unknown>;
}) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  // Local spinner state — awaits whatever onRefresh returns so the button
  // gives feedback during a refresh without the page's own loading gate
  // (which only covers the true first load) blanking the whole page.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isLive && <span className="live-indicator">Live data</span>}
        {updatedAt > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Updated {relTime(updatedAt)}</span>
        )}
      </div>
      <button className="btn btn-secondary btn-sm" onClick={handleClick} disabled={isRefreshing}>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={isRefreshing ? { animation: 'spin 0.8s linear infinite' } : undefined}
        >
          <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        {isRefreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );
}

/** Centered loading spinner shown while an API request is in flight. */
export function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loader-wrap">
      <div className="spinner" />
      <div className="loader-text">{label}</div>
    </div>
  );
}

/** Error / not-authorized / not-configured state — replaces mock fallbacks. */
export function ErrorState({ reason, onRetry }: { reason: Reason; onRetry?: () => void }) {
  return (
    <div className="error-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="error-state-icon">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div className="error-state-title">Couldn’t load data</div>
      <div className="error-state-text">{errorMessage(reason)}</div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={onRetry}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Retry
        </button>
      )}
    </div>
  );
}

/** Inline empty state for tables/lists that loaded successfully but have no rows. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-state-icon">
        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
      </svg>
      <div className="empty-state-text">{message}</div>
    </div>
  );
}
