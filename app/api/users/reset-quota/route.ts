import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/** POST { userId } — zeroes the user's usage for the current month. */
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

    // usage_tracking/{userId}/months/{YYYY-MM}
    const month = new Date().toISOString().slice(0, 7);
    await db
      .collection('usage_tracking').doc(userId)
      .collection('months').doc(month)
      .set({ tokensUsed: 0, voiceMinutes: 0, screenshotsUsed: 0, resetAt: Date.now() }, { merge: true });

    const userDoc = await db.collection('users').doc(userId).get();
    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'quota_reset',
      targetUserId: userId,
      targetUserEmail: userDoc.data()?.email || '',
      details: { month },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, message: `Quota reset for ${month}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reset quota';
    console.error('[users/reset-quota]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
