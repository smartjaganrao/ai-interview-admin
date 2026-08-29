import { db } from '@/lib/firebase-admin';

export interface Kpis {
  totalUsers: number;
  activeThisWeek: number;
  mrrByPlan: { free: number; quick_pass: number; pro: number; power: number };
  totalMRR: number;
  usersByPlan: { free: number; quick_pass: number; pro: number; power: number };
  churnRate: number;
}

/**
 * MRR is computed from each subscription's stored paid amount, never from the
 * live pricing config — a subscriber's effective price must not retroactively
 * change just because admin edits pricing later. Live pricing is only a
 * fallback for legacy subscriptions with no stored amount.
 */
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
    const d = doc.data();
    const plan = d.plan || 'free';
    const status = d.status || 'inactive';
    if (status !== 'active' || !(plan in fallbackPrice)) return;

    if (d.adminGranted && d.countTowardRevenue !== true) return;

    const amount = Number(d.amount) || 0;
    const monthlyEquivalent = amount > 0
      ? (d.billing === 'yearly' ? amount / 12 : amount)
      : fallbackPrice[plan];

    mrrByPlan[plan as keyof typeof mrrByPlan] += monthlyEquivalent;
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
    downgrades = logsSnapshot.docs.filter((doc) => doc.data().details?.newPlan === 'free').length;
  } catch {
    downgrades = 0;
  }

  const activeSubscribers = Object.values(usersByPlan).reduce((a, b) => a + b, 0) - usersByPlan.free;
  const churnRate = activeSubscribers > 0 ? (downgrades / activeSubscribers) * 100 : 0;

  return {
    totalUsers,
    activeThisWeek,
    mrrByPlan,
    totalMRR,
    usersByPlan,
    churnRate: Number(churnRate.toFixed(2)),
  };
}
