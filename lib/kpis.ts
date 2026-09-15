import { db } from '@/lib/firebase-admin';

export interface Kpis {
  totalUsers: number;
  activeThisWeek: number;
  mrrByPlan: { free: number; quick_pass: number; pro: number; power: number };
  totalMRR: number;
  usersByPlan: { free: number; quick_pass: number; pro: number; power: number };
  churnRate: number;
}

type PlanKey = 'free' | 'quick_pass' | 'pro' | 'power';

interface SubscriptionDoc {
  plan?: string;
  status?: string;
  adminGranted?: boolean;
  countTowardRevenue?: boolean;
  paymentId?: string | null;
  amount?: unknown;
  billing?: string;
}

/**
 * True when a subscription represents real money — a genuine paymentId
 * (only ever written by the actual Razorpay path, never touched by any
 * admin route) or an explicit admin override, or simply not an admin comp
 * at all. Shared between the MRR calc below and the Purchases page
 * (app/api/purchases/list/route.ts) so both surfaces agree on the same
 * definition of "real payment" instead of drifting into two subtly
 * different rules.
 */
export function isRealPayment(sub: {
  adminGranted?: boolean;
  countTowardRevenue?: boolean;
  paymentId?: string | null;
}): boolean {
  return !sub.adminGranted || !!sub.countTowardRevenue || !!sub.paymentId;
}

/**
 * A single subscription's contribution to MRR, or null if it shouldn't count
 * at all (inactive, unrecognized plan, or a comp with no real payment behind
 * it). Computed from the subscription's own stored paid amount, never from
 * the live pricing config — a subscriber's effective price must not
 * retroactively change just because admin edits pricing later. Live pricing
 * (fallbackPrice) is only used for legacy subscriptions that predate storing
 * amount/billing on the doc.
 *
 * `adminGranted` alone does NOT mean "no real payment" — app/api/users/
 * upgrade/route.ts stamps it on every admin-initiated plan write, including
 * an admin merely adjusting a plan for a customer who already paid for real
 * (that route never touches paymentId/amount, so they survive untouched).
 * `paymentId` is the durable signal: only the actual Razorpay payment path
 * (persistSubscription in ai-interview-landing) ever writes it, and no admin
 * route ever clears it — so its presence proves a real payment occurred
 * regardless of what admin actions happened to the record afterward. Before
 * this checked adminGranted+countTowardRevenue alone, ANY admin touching an
 * already-paying customer's plan (for any reason — a downgrade, a typo fix,
 * an unrelated adjustment) silently zeroed their MRR contribution, because
 * upgrade/route.ts sets adminGranted:true unconditionally and
 * countTowardRevenue defaults to false unless the admin explicitly ticks it.
 *
 * Pulled out of computeKpis() as its own function specifically so this rule
 * — the one thing in this file most likely to silently regress — can be unit
 * tested without mocking Firestore.
 */
export function computeSubscriptionMrrContribution(
  sub: SubscriptionDoc,
  fallbackPrice: Record<string, number>
): { plan: PlanKey; monthlyEquivalent: number } | null {
  const plan = sub.plan || 'free';
  const status = sub.status || 'inactive';
  if (status !== 'active' || !(plan in fallbackPrice)) return null;
  if (!isRealPayment(sub)) return null;

  // One-time purchases (Quick Pass, Pro — billing: 'one-time') are not
  // recurring revenue at all. This used to only branch on billing ===
  // 'yearly' vs "else, treat as monthly" — a one-time purchase fell into
  // that else branch and got counted as if its FULL purchase amount recurs
  // every month for as long as the subscription doc stays 'active' (e.g. a
  // single ₹250 Quick Pass inflating "Monthly Revenue" by ₹250 every month
  // until it expires). That's what made the Dashboard's MRR figure
  // disagree with the Purchases page's honest Lifetime/Active Revenue sums
  // — MRR should only reflect genuinely recurring subscriptions (Power).
  if (sub.billing === 'one-time') {
    return { plan: plan as PlanKey, monthlyEquivalent: 0 };
  }

  const amount = Number(sub.amount) || 0;
  const monthlyEquivalent = amount > 0
    ? (sub.billing === 'yearly' ? amount / 12 : amount)
    : fallbackPrice[plan];

  return { plan: plan as PlanKey, monthlyEquivalent };
}

export async function computeKpis(): Promise<Kpis> {
  if (!db) throw new Error('Database not configured');
  const dbInstance = db;

  const usersSnapshot = await dbInstance.collection('users').count().get();
  const totalUsers = usersSnapshot.data().count;

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeWeekSnapshot = await dbInstance
    .collection('interview_sessions')
    .where('startedAt', '>=', oneWeekAgo)
    .select('userId')
    .get();

  const activeUserIds = new Set(
    activeWeekSnapshot.docs.map((doc) => doc.data().userId)
  );
  const activeThisWeek = activeUserIds.size;

  let proPrice = 0;
  let quickPassPrice = 0;
  let powerPrice = 0;
  try {
    const pricingDoc = await dbInstance.collection('settings').doc('pricing').get();
    if (pricingDoc.exists) {
      const pd = pricingDoc.data() ?? {};
      proPrice = Number(pd.plans?.pro?.monthly ?? proPrice);
      quickPassPrice = Number(pd.plans?.quick_pass?.oneTime ?? quickPassPrice);
      powerPrice = Number(pd.plans?.power?.monthly ?? powerPrice);
    }
  } catch { /* use defaults */ }
  const fallbackPrice: Record<string, number> = { quick_pass: quickPassPrice, pro: proPrice, power: powerPrice };

  const subsSnapshot = await dbInstance.collection('subscriptions').get();
  let mrrByPlan = { free: 0, quick_pass: 0, pro: 0, power: 0 };

  subsSnapshot.docs.forEach((doc) => {
    const contribution = computeSubscriptionMrrContribution(doc.data(), fallbackPrice);
    if (!contribution) return;
    mrrByPlan[contribution.plan] += contribution.monthlyEquivalent;
  });

  mrrByPlan = {
    free: Math.round(mrrByPlan.free),
    quick_pass: Math.round(mrrByPlan.quick_pass),
    pro: Math.round(mrrByPlan.pro),
    power: Math.round(mrrByPlan.power),
  };
  const totalMRR = Object.values(mrrByPlan).reduce((a, b) => a + b, 0);

  const freePlans = await dbInstance.collection('users').where('plan', '==', 'free').count().get();
  const quickPassPlans = await dbInstance.collection('users').where('plan', '==', 'quick_pass').count().get();
  const proPlans = await dbInstance.collection('users').where('plan', '==', 'pro').count().get();
  const powerPlans = await dbInstance.collection('users').where('plan', '==', 'power').count().get();

  const usersByPlan = {
    free: freePlans.data().count,
    quick_pass: quickPassPlans.data().count,
    pro: proPlans.data().count,
    power: powerPlans.data().count,
  };

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  let downgrades = 0;
  try {
    // Scoped to this month at the Firestore level (not just filtered in
    // memory after fetching) — admin_logs only ever grows, so without this
    // every KPI computation re-read every user_upgrade log entry since the
    // app launched, not just this month's. Needs a composite index on
    // (action ASC, timestamp ASC) — see firestore.indexes.json.
    const logsSnapshot = await dbInstance
      .collection('admin_logs')
      .where('action', '==', 'user_upgrade')
      .where('timestamp', '>=', thisMonthStart.getTime())
      .get();
    // oldPlan must have actually been paid — without this, an admin
    // toggling an unrelated field (e.g. countTowardRevenue) on an
    // already-free user logs newPlan:'free' too, and got counted as a
    // "downgrade" despite never having left a paid plan. Confirmed live:
    // 6 of 13 "downgrades" one month were free -> free no-ops.
    downgrades = logsSnapshot.docs.filter((doc) => {
      const d = doc.data().details;
      return d?.newPlan === 'free' && d?.oldPlan && d.oldPlan !== 'free';
    }).length;
  } catch {
    downgrades = 0;
  }

  const activeSubscribers = Object.values(usersByPlan).reduce((a, b) => a + b, 0) - usersByPlan.free;
  // Denominator is subscribers at the START of the period (current + the
  // ones who left this month), not the current count — dividing by the
  // current count means every departure shrinks the denominator along with
  // growing the numerator, which can mechanically exceed 100% any time
  // downgrades approach the (already-small) remaining base. Confirmed live:
  // even after fixing the free->free miscount above, 7 real downgrades
  // against 5 currently-active subscribers gave 140%. This is the standard
  // "churned / (churned + still-active)" formula — always 0-100% by
  // construction. Not a true cohort-retention number (that needs an actual
  // subscriber-count snapshot at period start, which isn't tracked
  // anywhere yet) but a correct, bounded approximation without one.
  const startOfPeriodSubscribers = activeSubscribers + downgrades;
  const churnRate = startOfPeriodSubscribers > 0 ? (downgrades / startOfPeriodSubscribers) * 100 : 0;

  return {
    totalUsers,
    activeThisWeek,
    mrrByPlan,
    totalMRR,
    usersByPlan,
    churnRate: Number(churnRate.toFixed(2)),
  };
}
