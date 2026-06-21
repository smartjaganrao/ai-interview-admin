import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/** POST { userId } — zeroes the user's AI usage for today. */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const session = await getSession();
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // usage_tracking/{userId}/days/{YYYY-MM-DD} — matches dayKey() in
    // landing's checkAiQuota and the desktop app's own usage.service.ts.
    // (A previous version of this route wrote to a months/ subcollection
    // that nothing else ever reads — this reset silently did nothing.)
    const day = new Date().toISOString().slice(0, 10);
    await db
      .collection('usage_tracking').doc(userId)
      .collection('days').doc(day)
      .set({ tokensUsed: 0, voiceMinutes: 0, screenshotsUsed: 0, mockSessions: 0, resetAt: Date.now() }, { merge: false });

    const userDoc = await db.collection('users').doc(userId).get();
    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'quota_reset',
      targetUserId: userId,
      targetUserEmail: userDoc.data()?.email || '',
      details: { day },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, message: `Quota reset for ${day}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reset quota';
    console.error('[users/reset-quota]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
