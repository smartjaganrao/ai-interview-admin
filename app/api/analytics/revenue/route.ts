import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getCached } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const firestore = db;
    return getCached('analytics:revenue', 15 * 60 * 1000, async () => {

    // Prices from admin-managed settings/pricing
    let proPrice = 0, quickPassPrice = 0, powerPrice = 0;
    try {
      const pd = await firestore.collection('settings').doc('pricing').get();
      if (pd.exists) {
        proPrice = Number(pd.data()?.plans?.pro?.monthly ?? 0);
        quickPassPrice = Number(pd.data()?.plans?.quick_pass?.oneTime ?? 0);
        powerPrice = Number(pd.data()?.plans?.power?.monthly ?? 0);
      }
    } catch { /* leave at 0 */ }
    const planPrices: Record<string, number> = { quick_pass: quickPassPrice, pro: proPrice, power: powerPrice };

    // Get last 12 months of revenue data
    const revenueByMonth: Record<string, number> = {};
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
      const subsSnapshot = await firestore.collection('subscriptions').get();

      let mrr = 0;
      subsSnapshot.docs.forEach((doc) => {
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
    });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch revenue';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
