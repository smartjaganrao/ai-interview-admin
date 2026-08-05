import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const session = await getSession();
    const { userId, newPlan, countTowardRevenue = false } = await request.json();

    if (!userId || !newPlan) {
      return NextResponse.json({ error: 'Missing userId or newPlan' }, { status: 400 });
    }
    const validPlans = ['free', 'quick_pass', 'pro', 'power'];
    if (!validPlans.includes(newPlan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const oldPlan = userDoc.data()?.plan || 'free';
    const renewalDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

    const adminGranted = true;
    const now = Date.now();

    await db.collection('subscriptions').doc(userId).set(
      {
        plan: newPlan,
        planType: 'subscription',
        status: 'active',
        renewalDate,
        updatedAt: now,
        adminGranted,
        countTowardRevenue,
      },
      { merge: true }
    );
    await db.collection('users').doc(userId).set(
      {
        plan: newPlan,
        updatedAt: now,
        adminGranted,
        countTowardRevenue,
      },
      { merge: true }
    );

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'user_upgrade',
      targetUserId: userId,
      targetUserEmail: userDoc.data()?.email || '',
      details: { oldPlan, newPlan, countTowardRevenue },
      timestamp: now,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, message: `Plan changed ${oldPlan} → ${newPlan}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to change plan';
    console.error('[users/upgrade]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
