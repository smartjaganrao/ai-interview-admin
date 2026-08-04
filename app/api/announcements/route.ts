import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';
import { getCached, invalidateCache } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';

/** GET — list all announcements (newest first) for the admin panel. */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  return getCached('announcements:list', 2 * 60 * 1000, async () => {
    const snap = await db!.collection('announcements').orderBy('createdAt', 'desc').limit(100).get();
    const announcements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ announcements });
  });
}

/** POST { title, body, link?, active } — create a new announcement. */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();

  const { title, body, link, active } = await request.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
  }

  const now = Date.now();
  const ref = await db.collection('announcements').add({
    title: title.trim(),
    body: body.trim(),
    link: link?.trim() || null,
    active: active !== false,
    createdAt: now,
    createdBy: session?.email || 'system',
  });

  await db.collection('admin_logs').add({
    adminUid: session?.uid || 'system', adminEmail: session?.email || 'system',
    action: 'announcement_create', targetId: ref.id, details: { title: title.trim() }, timestamp: now,
  });

  invalidateCache('announcements:list');

  return NextResponse.json({ ok: true, id: ref.id });
}
