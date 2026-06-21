import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/** POST — marks all current notifications as seen for the calling admin. */
export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();
  if (!session?.uid) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  await db.collection('admin_notification_state').doc(session.uid).set({ lastSeenAt: Date.now() }, { merge: true });

  return NextResponse.json({ ok: true });
}
