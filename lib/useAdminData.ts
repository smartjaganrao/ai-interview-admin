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

const FETCH_TIMEOUT_MS = 20_000;

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    async function load() {
      setState((s) => ({ ...s, loading: true, reason: 'loading' }));

      try {
        const res = await fetch(url, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (cancelled) return;
        if (res.ok) {
          const json = await res.json();
          const data = select ? select(json) : (json as T);
          setState({ data, isLive: true, loading: false, reason: 'live' });
        } else {
          const reason: Reason =
            res.status === 503 ? 'not-configured'
            : res.status >= 500 ? 'error'
            : 'unauthorized';
          setState({ data: initial, isLive: false, loading: false, reason });
        }
      } catch {
        if (cancelled) return;
        setState({ data: initial, isLive: false, loading: false, reason: 'error' });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    load();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
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
      return 'The server is not configured to read data yet (Firebase Admin SDK key missing on the deployment).';
    case 'error':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong.';
  }
}
