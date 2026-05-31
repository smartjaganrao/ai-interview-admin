import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!db || !auth) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      );
    }

    const { userId, newPlan } = await request.json();

    if (!userId || !newPlan) {
      return NextResponse.json(
        { error: 'Missing userId or newPlan' },
        { status: 400 }
      );
    }

    // Validate plan
    const validPlans = ['free', 'pro', 'power'];
    if (!validPlans.includes(newPlan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get current plan for audit log
    const userDoc = await db.collection('users').doc(userId).get();
    const oldPlan = userDoc.data()?.plan || 'free';

    // Update subscription
    const renewalDate = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    await db
      .collection('subscriptions')
      .doc(userId)
      .set(
        {
          plan: newPlan,
          renewalDate,
          status: 'active',
          updatedAt: Date.now(),
        },
        { merge: true }
      );

    // Create audit log
    await db
      .collection('admin_logs')
      .add({
        adminUid: session.uid,
        adminEmail: session.email,
        action: 'user_upgrade',
        targetUserId: userId,
        targetUserEmail: userDoc.data()?.email || '',
        details: {
          oldPlan,
          newPlan,
        },
        timestamp: Date.now(),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      message: `User upgraded from ${oldPlan} to ${newPlan}`,
    });
  } catch (error: any) {
    console.error('Error upgrading user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade user' },
      { status: 500 }
    );
  }
}
