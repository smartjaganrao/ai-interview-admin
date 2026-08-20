import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/** POST { userIds: string[] } — reset profile completion for selected users. */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const session = await getSession();
    const body = await request.json().catch(() => ({}));
    const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds : [];
    if (userIds.length === 0) {
      return NextResponse.json({ error: 'Missing userIds' }, { status: 400 });
    }

    const batch = db.batch();
    let failed = 0;

    for (const uid of userIds) {
      try {
        const userRef = db.collection('users').doc(uid);
        batch.set(
          userRef,
          {
            profileCompleted: false,
            profile: null,
            acquisition: null,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch {
        failed++;
      }
    }

    await batch.commit();

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'bulk_reset_profile',
      targetUserId: userIds[0],
      details: { count: userIds.length, failed },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, count: userIds.length, failed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reset profile';
    console.error('[users/reset-profile]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
