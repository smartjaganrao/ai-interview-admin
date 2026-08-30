'use client';

import { useQuery } from '@tanstack/react-query';

export type Reason = 'live' | 'unauthorized' | 'not-configured' | 'error' | 'loading';

interface AdminDataState<T> {
  data: T;
  isLive: boolean;
  loading: boolean;
  reason: Reason;
  refetch: () => void;
}

interface FetchResult<T> {
  data: T;
  isLive: boolean;
  reason: Reason;
}

const FETCH_TIMEOUT_MS = 20_000;
const LS_PREFIX = 'admin-data:';

function storageKey(url: string): string {
  try {
    return `${LS_PREFIX}${btoa(url)}`;
  } catch {
    return `${LS_PREFIX}${url}`;
  }
}

function readCached<T>(url: string): { data: T; ts: number } | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; ts: number };
    if (!parsed || typeof parsed.ts !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache<T>(url: string, data: T) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(storageKey(url), JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // quota / private mode — ignore
  }
}

/**
 * Fetches `url` and always resolves (never throws) with a classified reason,
 * falling back to the localStorage cache on any non-ok response or network
 * error. React Query's own retry is disabled (see useAdminData) since this
 * fail-soft fallback already is the retry/error strategy.
 */
async function fetchAdminData<T>(
  url: string,
  initial: T,
  select?: (json: unknown) => T
): Promise<FetchResult<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (res.ok) {
      const json = await res.json();
      const data = select ? select(json) : (json as T);
      writeCache(url, data);
      return { data, isLive: true, reason: 'live' };
    }
    const json = await res.json().catch(() => ({}));
    const errorMessage = typeof json.error === 'string' ? json.error : '';
    const reason: Reason =
      res.status === 503 || (res.status === 500 && /database not configured/i.test(errorMessage))
        ? 'not-configured'
        : res.status >= 500
          ? 'error'
          : 'unauthorized';
    const cached = readCached<T>(url);
    return { data: cached?.data ?? initial, isLive: false, reason };
  } catch {
    const cached = readCached<T>(url);
    return { data: cached?.data ?? initial, isLive: false, reason: 'error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * React-Query-backed replacement for the old useEffect+fetch hook. Every
 * remount used to re-fetch unconditionally (`cache: 'no-store'`), so
 * navigating between admin pages and back re-hit the API (and, on a
 * server-cache miss, Firestore) every time. Query caching by `url` with
 * staleTime: Infinity (set on the QueryClient in app/providers.tsx) means a
 * remount never triggers a background re-fetch on its own — the API only
 * sees a request on the very first load (no cache yet) or when a caller
 * invokes refetch() (the page's Refresh button).
 */
export function useAdminData<T>(
  url: string,
  initial: T,
  select?: (json: unknown) => T
): AdminDataState<T> {
  const cachedAtStart = readCached<T>(url);

  const query = useQuery<FetchResult<T>>({
    queryKey: ['admin-data', url],
    queryFn: () => fetchAdminData(url, initial, select),
    // Seed from localStorage so a page revisited after a hard reload (i.e.
    // no in-memory query cache) still shows data instantly instead of a
    // blank loading state, same as the old hook.
    initialData: cachedAtStart
      ? { data: cachedAtStart.data, isLive: true, reason: 'live' as Reason }
      : undefined,
    initialDataUpdatedAt: cachedAtStart?.ts,
  });

  return {
    data: query.data?.data ?? initial,
    isLive: query.data?.isLive ?? false,
    loading: query.isFetching,
    reason: query.data?.reason ?? 'loading',
    refetch: () => {
      void query.refetch();
    },
  };
}

export function errorMessage(reason: Reason): string {
  switch (reason) {
    case 'unauthorized':
      return 'Not authorized. Please sign in with an admin account.';
    case 'not-configured':
      return 'The server is not configured to read data yet (Firebase Admin SDK key missing on the deployment).';
    case 'error':
      return 'Could not reach the server. Showing cached data. Retry when quota is available.';
    default:
      return 'Something went wrong.';
  }
}
