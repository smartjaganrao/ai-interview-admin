import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getCached } from '@/lib/route-cache';
import { isRealPayment } from '@/lib/kpis';

export const dynamic = 'force-dynamic';

/**
 * The customer list below is built from subscriptions/{uid} — one doc per
 * CUSTOMER's current state (every subscriptions/{uid} doc that ever
 * represented a real transaction or admin grant) — this is a HISTORY, not a
 * snapshot of who's currently paying. Revenue totals are computed
 * separately, below, from the payments/{paymentId} ledger (one doc per
 * TRANSACTION) — see the lifetimeRevenue comment further down for why those
 * need to be two different collections.
 * A plain `plan !== 'free'` filter looked right at first but silently drops
 * two real cases: ai-interview-landing's expiry-enforcement cron downgrades
 * users/{uid}.plan on lapse but deliberately leaves subscriptions/{uid}.plan
 * alone (so this stays included — correct), while app/api/users/refund
 * explicitly resets subscriptions/{uid}.plan to 'free' on refund — which
 * would silently make a refunded purchase VANISH from this page entirely
 * under a plan-only filter, the one record a purchase history most needs to
 * keep. Every users/{uid} also gets a subscriptions/{uid} doc created at
 * signup with plan:'free' (ensureUserDocs, lib/auth.ts) even for users who
 * never paid anything — `everRepresentedMoney` is what actually
 * distinguishes "this doc is purchase history" from "this is just the
 * default doc every signup gets".
 */
function everRepresentedMoney(s: FirebaseFirestore.DocumentData): boolean {
  return (
    (!!s.plan && s.plan !== 'free') ||
    s.status === 'expired' ||
    s.status === 'refunded' ||
    !!s.paymentId ||
    (Number(s.amount) || 0) > 0 ||
    !!s.adminGranted
  );
}

export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const firestore = db;

    return getCached('purchases:list', 5 * 60 * 1000, async () => {
      const [snap, paymentsSnap] = await Promise.all([
        firestore.collection('subscriptions').get(),
        firestore.collection('payments').get(),
      ]);
      const subs = snap.docs.filter((d) => everRepresentedMoney(d.data()));

      const userSnaps = subs.length > 0
        ? await firestore.getAll(...subs.map((d) => firestore.collection('users').doc(d.id)))
        : [];
      const userMap = new Map(userSnaps.map((s) => [s.id, s.data() as Record<string, unknown> | undefined]));

      const purchases = subs.map((d) => {
        const s = d.data();
        const u = userMap.get(d.id) || {};
        const planType = (s.planType as string) || null;
        const planExpiresAt = planType === 'one-time'
          ? ((s.expiresAt as number) ?? null)
          : ((s.renewalDate as number) ?? null);

        // users/{uid}.plan is what actually gates quota/features (checkAiQuota
        // reads it, not subscriptions.plan) — the two are supposed to be
        // written together by every current mutation path (persistSubscription,
        // users/upgrade, users/refund all set both atomically), but a legacy
        // write can still leave them disagreeing. Surface that instead of
        // silently showing the (possibly stale) subscriptions.plan as if it
        // were current access.
        const actualPlan = (u.plan as string) || null;
        const planMismatch = !!actualPlan && actualPlan !== s.plan;
        const paymentId = (s.paymentId as string) || null;

        // app/api/users/refund resets subscriptions/{uid}.plan to 'free' on
        // refund (correct — that's the real current access state) and
        // separately stores refundedPlan so this history view can still show
        // what was actually purchased instead of "FREE". Records refunded
        // before that field existed just fall back to 'free' — no way to
        // recover what they were after the fact.
        const displayPlan = (s.status === 'refunded' && s.refundedPlan) ? (s.refundedPlan as string) : (s.plan as string);

        return {
          uid: d.id,
          email: (u.email as string) || '',
          name: (u.name as string) || '',
          plan: displayPlan,
          actualPlan,
          planMismatch,
          billing: (s.billing as string) || null,
          amount: (s.amount as number) ?? 0,
          status: (s.status as string) || 'unknown',
          startedAt: (s.startedAt as number) ?? null,
          planExpiresAt,
          paymentId,
          orderId: (s.orderId as string) || null,
          couponCode: (s.couponCode as string) || null,
          adminGranted: !!s.adminGranted,
          countTowardRevenue: !!s.countTowardRevenue,
          // Same rule computeSubscriptionMrrContribution (lib/kpis.ts) uses
          // for MRR — a real paymentId proves this is genuine money even if
          // an admin also touched the record afterward (adminGranted gets
          // stamped on every admin plan write regardless of payment history).
          isRealPayment: isRealPayment({ adminGranted: !!s.adminGranted, countTowardRevenue: !!s.countTowardRevenue, paymentId }),
          refundedAt: (s.refundedAt as number) ?? null,
        };
      });

      // Newest purchase first — matches Users page's default sort convention.
      purchases.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));

      // Two genuinely different numbers, both real — conflating them into one
      // "Total Revenue" is exactly the confusion this page exists to remove:
      //   - lifetimeRevenue: every real payment ever KEPT, across ALL of a
      //     customer's transactions — not "current state per customer".
      //     subscriptions/{uid} is a single doc overwritten on every
      //     purchase, so a repeat purchaser's earlier payments are
      //     unrecoverable from it (confirmed live: a real customer's first
      //     ₹135 payment vanished entirely once their second purchase
      //     overwrote the same doc). payments/{paymentId} is the real
      //     append-only ledger (written by persistSubscription,
      //     ai-interview-landing/lib/firebase-admin.ts) this is summed from
      //     instead — one immutable doc per real payment, so nothing gets
      //     silently lost to a later purchase. Excludes anything with
      //     refundedAt set (money actually went back). This is the number
      //     that should NEVER decrease just because a plan expires — expiry
      //     is a plan-access event, not a money event.
      //   - activeRevenue: real payments on currently-active subscriptions
      //     only, from the CURRENT-STATE subscriptions collection (not the
      //     ledger) — deliberately so a monthly subscriber's many past
      //     renewal payments don't each get summed as if concurrently
      //     active. A current-state snapshot (closer to MRR), which DOES
      //     drop when a subscription expires or gets refunded, correctly.
      // Same accrual rule as computeSubscriptionMrrContribution (lib/kpis.ts)
      // for the active figure — shared via isRealPayment() so these and the
      // Analytics dashboard's MRR never drift into two different
      // definitions of "real payment".
      let lifetimeRevenue = 0;
      let refundedAmount = 0;
      for (const doc of paymentsSnap.docs) {
        const amount = Number(doc.data().amount) || 0;
        if (doc.data().refundedAt) refundedAmount += amount;
        else lifetimeRevenue += amount;
      }
      const activeRevenue = purchases.reduce(
        (sum, p) => (p.status === 'active' && p.isRealPayment ? sum + (p.amount || 0) : sum),
        0
      );

      const stats = {
        total: purchases.length,
        totalTransactions: paymentsSnap.size,
        active: purchases.filter((p) => p.status === 'active').length,
        expired: purchases.filter((p) => p.status === 'expired').length,
        refunded: purchases.filter((p) => p.status === 'refunded').length,
        mismatched: purchases.filter((p) => p.planMismatch).length,
        lifetimeRevenue,
        activeRevenue,
        refundedAmount,
      };

      return { purchases, stats };
    }).then((data) => NextResponse.json(data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch purchases';
    console.error('[purchases/list]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
