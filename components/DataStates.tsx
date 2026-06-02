'use client';

import { errorMessage, type Reason } from '@/lib/useAdminData';

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
