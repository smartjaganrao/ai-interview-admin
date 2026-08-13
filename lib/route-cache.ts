type CacheEntry<T> = { data: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) {
    return Promise.resolve(entry.data);
  }
  cache.delete(key);
  const promise = fetcher().then((data) => {
    // Don't cache Response objects — their body stream is single-use and
    // silently returns empty on reuse, which makes analytics/users pages
    // appear empty after the first load.
    if (!(data instanceof Response)) {
      cache.set(key, { data, expiresAt: now + ttlMs });
    }
    return data;
  }).catch((err) => {
    throw err;
  });

  return promise;
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function clearCache(): void {
  cache.clear();
}
