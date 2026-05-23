import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get total users
    const usersSnapshot = await db.collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;

    // Get active this week (users with sessions in last 7 days)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeWeekSnapshot = await db
      .collection('interview_sessions')
      .where('startedAt', '>=', oneWeekAgo)
      .select('userId')
      .get();

    const activeUserIds = new Set(
      activeWeekSnapshot.docs.map((doc: any) => doc.data().userId)
    );
    const activeThisWeek = activeUserIds.size;

    // Get MRR (monthly recurring revenue)
    const subsSnapshot = await db.collection('subscriptions').get();
    let mrrByPlan = { free: 0, pro: 0, power: 0 };
    const planPrices: any = { pro: 499, power: 999 };

    subsSnapshot.docs.forEach((doc: any) => {
      const plan = doc.data().plan || 'free';
      const status = doc.data().status || 'inactive';

      if (status === 'active' && plan in planPrices) {
        mrrByPlan[plan as keyof typeof mrrByPlan] =
          (mrrByPlan[plan as keyof typeof mrrByPlan] || 0) + planPrices[plan];
      }
    });

    const totalMRR = Object.values(mrrByPlan).reduce((a, b) => a + b, 0);

    // Get user distribution by plan
    const freePlans = await db
      .collection('users')
      .where('plan', '==', 'free')
      .count()
      .get();
    const proPlans = await db
      .collection('users')
      .where('plan', '==', 'pro')
      .count()
      .get();
    const powerPlans = await db
      .collection('users')
      .where('plan', '==', 'power')
      .count()
      .get();

    const usersByPlan = {
      free: freePlans.data().count,
      pro: proPlans.data().count,
      power: powerPlans.data().count,
    };

    // Calculate churn rate (simple: users who canceled/downgraded this month)
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const logsSnapshot = await db
      .collection('admin_logs')
      .where('timestamp', '>=', thisMonthStart.getTime())
      .where('action', '==', 'user_upgrade')
      .get();

    const downgrades = logsSnapshot.docs.filter((doc: any) => {
      const details = doc.data().details;
      return details.newPlan === 'free'; // Downgrade to free = churn
    }).length;

    const activeSubscribers = Object.values(usersByPlan).reduce((a, b) => a + b, 0) - usersByPlan.free;
    const churnRate = activeSubscribers > 0 ? (downgrades / activeSubscribers) * 100 : 0;

    return NextResponse.json({
      totalUsers,
      activeThisWeek,
      mrrByPlan,
      totalMRR,
      usersByPlan,
      churnRate: Number(churnRate.toFixed(2)),
    });
  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}
