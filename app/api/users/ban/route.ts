import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/** POST { userId, ban: boolean } — ban or unban a user (sets users/{id}.status). */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const session = await getSession();
    const { userId, ban } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const shouldBan = ban !== false; // default to ban unless explicitly false
    const userDoc = await db.collection('users').doc(userId).get();

    await db.collection('users').doc(userId).set(
      { status: shouldBan ? 'banned' : 'active', updatedAt: Date.now() },
      { merge: true }
    );

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: shouldBan ? 'user_ban' : 'user_unban',
      targetUserId: userId,
      targetUserEmail: userDoc.data()?.email || '',
      details: { status: shouldBan ? 'banned' : 'active' },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, status: shouldBan ? 'banned' : 'active' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    console.error('[users/ban]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
