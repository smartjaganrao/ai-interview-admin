import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';
import { clearCache } from '@/lib/route-cache';

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
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const oldPlan = userDoc.data()?.plan || 'free';
    const now = Date.now();
    const renewalDate = now + 30 * 24 * 60 * 60 * 1000;

    const adminGranted = true;

    // Downgrading to free is not a subscription renewal — it must not leave
    // the subscriptions doc looking like an active paid plan. Previously
    // this always wrote status:'active' + a fresh 30-day renewalDate
    // regardless of newPlan, so a free downgrade kept its old paid `amount`
    // untouched underneath a status/renewalDate saying "active, renews in
    // 30 days". That stale doc then fed two other surfaces: the Purchases
    // page showed the customer as FREE + active with a real ₹ amount and a
    // future expiry (confirmed live), and its activeRevenue sum
    // (app/api/purchases/list/route.ts) — which only checks
    // status==='active', not plan — kept counting their old amount as
    // currently-active revenue even though they no longer pay anything.
    const subscriptionUpdate = newPlan === 'free'
      ? { plan: newPlan, status: 'expired', updatedAt: now, adminGranted, countTowardRevenue }
      : { plan: newPlan, planType: 'subscription', status: 'active', renewalDate, updatedAt: now, adminGranted, countTowardRevenue };

    await db.collection('subscriptions').doc(userId).set(subscriptionUpdate, { merge: true });
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

    // /api/users/list caches its response for 5 minutes (route-cache.ts) —
    // without this, the admin's own refetch() right after a plan change
    // kept serving the pre-change cached list, making the change look like
    // it silently didn't take even though Firestore was already updated.
    clearCache();

    return NextResponse.json({ success: true, message: `Plan changed ${oldPlan} → ${newPlan}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to change plan';
    console.error('[users/upgrade]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
