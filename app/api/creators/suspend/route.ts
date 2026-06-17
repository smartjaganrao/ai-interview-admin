import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/**
 * POST { creatorId, suspend } — suspend (or reactivate) a creator. A suspended
 * creator's link stops accruing new commission; already-accrued balance is
 * unaffected.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const session = await getSession();
    const { creatorId, suspend } = await request.json();
    if (!creatorId || typeof suspend !== 'boolean') {
      return NextResponse.json({ error: 'creatorId and suspend (boolean) are required' }, { status: 400 });
    }

    const creatorRef = db.collection('creators').doc(creatorId);
    const creatorSnap = await creatorRef.get();
    if (!creatorSnap.exists) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const newStatus = suspend ? 'suspended' : 'active';
    await creatorRef.set({ status: newStatus, updatedAt: Date.now() }, { merge: true });

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'creator_status',
      targetUserId: creatorId,
      details: { code: creatorSnap.data()?.code, status: newStatus },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, message: suspend ? 'Creator suspended' : 'Creator reactivated' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update creator';
    console.error('[creators/suspend]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
