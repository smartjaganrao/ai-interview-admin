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

    const planPrices: any = { pro: 499, power: 999 };

    // Get last 12 months of revenue data
    const revenueByMonth: any = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });

      const monthStart = new Date(monthDate);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthDate);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setHours(0, 0, 0, 0);

      // Get all active subscriptions during this month
      const subsSnapshot = await db.collection('subscriptions').get();

      let mrr = 0;
      subsSnapshot.docs.forEach((doc: any) => {
        const plan = doc.data().plan || 'free';
        const status = doc.data().status || 'inactive';
        const startedAt = doc.data().startedAt || Date.now();

        // Only count subscriptions that were active during this month
        if (status === 'active' && startedAt < monthEnd.getTime()) {
          if (plan in planPrices) {
            mrr += planPrices[plan];
          }
        }
      });

      revenueByMonth[monthKey] = mrr;
    }

    // Convert to array format for charts
    const revenueData = Object.entries(revenueByMonth).map(([month, mrr]) => ({
      month,
      mrr: Number(mrr),
    }));

    return NextResponse.json({
      revenueData,
      totalMRR: revenueData[revenueData.length - 1]?.mrr || 0,
    });
  } catch (error: any) {
    console.error('Error fetching revenue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch revenue' },
      { status: 500 }
    );
  }
}
