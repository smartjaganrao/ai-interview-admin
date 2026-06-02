'use client';

/** POSTs a mutation to an admin API route. Returns {ok, error}. */
export async function postAdmin(
  url: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `Request failed (${res.status})` };
    }
    return { ok: true, message: data.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
