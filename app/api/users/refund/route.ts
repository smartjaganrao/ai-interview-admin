import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';
import { clearCache } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';

/**
 * POST { userId, reason? } — record a refund and reverse entitlements.
 *
 * The actual money is refunded in the Razorpay dashboard (manual). This:
 *   1. Marks the subscription refunded + downgrades the user to free.
 *   2. Claws back any *accrued* (unpaid) creator commission from this user's
 *      payments — decrements the creator's totalEarned, marks them refunded.
 *      Already-paid commissions are reported but not reversed (money's out).
 *   3. Writes an admin_logs entry.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await getSession();
    const { userId, reason } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const now = Date.now();

    // 1) Downgrade + mark refunded. plan is reset to 'free' here (it's the
    // field that matters for access), but that would otherwise make a
    // refunded purchase's history entry show "FREE" instead of what was
    // actually bought and refunded — refundedPlan preserves that for the
    // Purchases page (app/api/purchases/list/route.ts) to display.
    const subRef = db.collection('subscriptions').doc(userId);
    const subSnap = await subRef.get();
    const refundedPlan = (subSnap.data()?.plan as string) || null;
    const refundedPaymentId = (subSnap.data()?.paymentId as string) || null;
    await subRef.set(
      { status: 'refunded', plan: 'free', refundedPlan, cancelAtPeriodEnd: false, refundedAt: now, updatedAt: now },
      { merge: true },
    );
    await db.collection('users').doc(userId).set({ plan: 'free', updatedAt: now }, { merge: true });

    // Mark the matching payments/{paymentId} ledger entry (see
    // persistSubscription in ai-interview-landing/lib/firebase-admin.ts) so
    // the Purchases page's Lifetime Revenue excludes it going forward — that
    // money genuinely went back to the customer. Only marks the payment
    // currently on record (subscriptions/{uid}.paymentId is the LATEST real
    // payment, which is what a refund action realistically refers to — an
    // admin refunding a user is refunding their current/active charge, not
    // reaching back into older already-consumed one-time passes). No-op if
    // there's no paymentId (e.g. a pure admin comp with nothing to refund).
    if (refundedPaymentId) {
      // update(), not set(...,{merge:true}) — a payment made before this
      // ledger existed (or before the one-off backfill runs) has no
      // payments/{paymentId} doc at all yet; set+merge would silently
      // create a sparse phantom entry with only refundedAt and no amount,
      // which would then miscount "Total Transactions" for nothing. update()
      // throws NOT_FOUND instead, which is the correct, harmless outcome
      // here — there's genuinely nothing to mark.
      await db.collection('payments').doc(refundedPaymentId).update({ refundedAt: now }).catch(() => {});
    }

    // 2) Claw back accrued creator commissions from this user's payments
    const comms = await db.collection('creator_commissions').where('userId', '==', userId).get();
    let clawedBack = 0;
    let paidUnrecoverable = 0;
    for (const c of comms.docs) {
      const data = c.data();
      if (data.status === 'accrued') {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(c.ref);
          if (fresh.data()?.status !== 'accrued') return;
          const amount = fresh.data()?.commissionAmount ?? 0;
          tx.update(c.ref, { status: 'refunded', refundedAt: now });
          tx.update(db!.collection('creators').doc(fresh.data()!.creatorId), {
            totalEarned: admin.firestore.FieldValue.increment(-amount),
            updatedAt: now,
          });
        });
        clawedBack += data.commissionAmount ?? 0;
      } else if (data.status === 'paid') {
        paidUnrecoverable += data.commissionAmount ?? 0;
      }
    }

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'user_refund',
      targetUserId: userId,
      details: { reason: reason || '', clawedBackCommission: clawedBack, paidUnrecoverableCommission: paidUnrecoverable },
      timestamp: now,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // See users/upgrade/route.ts — /api/users/list's 5-minute cache
    // otherwise masks this change from the admin's own next refetch().
    clearCache();

    const note = paidUnrecoverable > 0
      ? ` (₹${paidUnrecoverable} commission was already paid out — recover manually)`
      : '';
    return NextResponse.json({
      success: true,
      message: `Refund recorded, user downgraded. Clawed back ₹${clawedBack} accrued commission${note}. Issue the money refund in Razorpay.`,
      clawedBack, paidUnrecoverable,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record refund';
    console.error('[users/refund]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
