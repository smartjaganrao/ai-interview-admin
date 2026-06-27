import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/session-server';

// Latest desktop release info for the dashboard's "Current desktop build"
// widget. Proxies the landing site's public /api/release endpoint instead of
// duplicating the GitHub token + fetch logic here — keeps the token in one
// place and both apps in sync automatically on every release.
const LANDING_RELEASE_URL = 'https://javihai.in/api/release';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const res = await fetch(LANDING_RELEASE_URL, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    const release = await res.json();
    return NextResponse.json(release);
  } catch {
    return NextResponse.json({ error: 'Could not reach landing site' }, { status: 502 });
  }
}
