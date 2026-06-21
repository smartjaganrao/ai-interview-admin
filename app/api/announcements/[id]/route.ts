import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/** PATCH { title?, body?, link?, active? } — update an announcement. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();
  const { id } = await params;

  const patch = await request.json();
  const update: Record<string, unknown> = { updatedAt: Date.now() };
  if (typeof patch.title === 'string') update.title = patch.title.trim();
  if (typeof patch.body === 'string') update.body = patch.body.trim();
  if ('link' in patch) update.link = patch.link?.trim() || null;
  if (typeof patch.active === 'boolean') update.active = patch.active;

  await db.collection('announcements').doc(id).update(update);

  await db.collection('admin_logs').add({
    adminUid: session?.uid || 'system', adminEmail: session?.email || 'system',
    action: 'announcement_update', targetId: id, details: update, timestamp: Date.now(),
  });

  return NextResponse.json({ ok: true });
}

/** DELETE — remove an announcement. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();
  const { id } = await params;

  await db.collection('announcements').doc(id).delete();

  await db.collection('admin_logs').add({
    adminUid: session?.uid || 'system', adminEmail: session?.email || 'system',
    action: 'announcement_delete', targetId: id, timestamp: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
