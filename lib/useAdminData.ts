'use client';

import { useCallback, useEffect, useState } from 'react';

export type Reason = 'live' | 'unauthorized' | 'not-configured' | 'error' | 'loading';

interface AdminDataState<T> {
  data: T;
  isLive: boolean;
  loading: boolean;
  reason: Reason;
  refetch: () => void;
}

/**
 * Fetches an admin API route. NO mock/demo fallback — while the request is in
 * flight `loading` is true (show a loader); on success `data` is the real
 * payload; on failure `data` stays at the empty `initial` value and `reason`
 * explains why (so the UI can render an error state instead of fake numbers).
 *
 * - 200            -> real data, isLive = true, reason = 'live'
 * - 401/403        -> reason = 'unauthorized' (not signed in as admin)
 * - 500/503        -> reason = 'not-configured' (Admin SDK secret missing)
 * - network/parse  -> reason = 'error'
 */
export function useAdminData<T>(
  url: string,
  initial: T,
  select?: (json: unknown) => T
): AdminDataState<T> {
  const [state, setState] = useState<Omit<AdminDataState<T>, 'refetch'>>({
    data: initial,
    isLive: false,
    loading: true,
    reason: 'loading',
  });
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, reason: 'loading' }));

    fetch(url, { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const json = await res.json();
          const data = select ? select(json) : (json as T);
          setState({ data, isLive: true, loading: false, reason: 'live' });
        } else {
          const reason: Reason = res.status >= 500 ? 'not-configured' : 'unauthorized';
          setState({ data: initial, isLive: false, loading: false, reason });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ data: initial, isLive: false, loading: false, reason: 'error' });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce]);

  return { ...state, refetch };
}

export function errorMessage(reason: Reason): string {
  switch (reason) {
    case 'unauthorized':
      return 'Not authorized. Please sign in with an admin account.';
    case 'not-configured':
      return 'The server isn’t configured to read data yet (Firebase Admin SDK key missing on the deployment).';
    case 'error':
      return 'Couldn’t reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong.';
  }
}
