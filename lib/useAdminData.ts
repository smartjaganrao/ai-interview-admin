'use client';

import { useEffect, useState } from 'react';

interface AdminDataState<T> {
  data: T;
  isLive: boolean;
  loading: boolean;
  /** Set when the API responded but auth/config is missing, so the UI can hint at setup. */
  reason: 'live' | 'unauthorized' | 'not-configured' | 'error' | 'loading';
}

/**
 * Fetches an admin API route and falls back to demo data when the backend
 * isn't fully wired yet (no Admin SDK secret, no admin session, etc.).
 *
 * - 200            -> live data, isLive = true
 * - 401/403        -> demo data, reason = 'unauthorized' (need admin session)
 * - 500            -> demo data, reason = 'not-configured' (need FIREBASE_ADMIN_SDK_JSON)
 * - network/parse  -> demo data, reason = 'error'
 */
export function useAdminData<T>(
  url: string,
  fallback: T,
  select?: (json: unknown) => T
): AdminDataState<T> {
  const [state, setState] = useState<AdminDataState<T>>({
    data: fallback,
    isLive: false,
    loading: true,
    reason: 'loading',
  });

  useEffect(() => {
    let cancelled = false;

    fetch(url, { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const json = await res.json();
          const data = select ? select(json) : (json as T);
          setState({ data, isLive: true, loading: false, reason: 'live' });
        } else {
          const reason = res.status === 500 ? 'not-configured' : 'unauthorized';
          setState({ data: fallback, isLive: false, loading: false, reason });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ data: fallback, isLive: false, loading: false, reason: 'error' });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return state;
}

/** Small badge shown on data-backed pages to indicate live vs. demo. */
export function dataSourceLabel(reason: AdminDataState<unknown>['reason']): {
  text: string;
  className: string;
} {
  switch (reason) {
    case 'live':
      return { text: '● Live data', className: 'badge-green' };
    case 'not-configured':
      return { text: 'Demo · backend not configured', className: 'badge-yellow' };
    case 'unauthorized':
      return { text: 'Demo · sign in as admin for live data', className: 'badge-yellow' };
    case 'loading':
      return { text: 'Loading…', className: 'badge-slate' };
    default:
      return { text: 'Demo data', className: 'badge-slate' };
  }
}
