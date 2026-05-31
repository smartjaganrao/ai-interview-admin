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

    // Get all users grouped by signup month
    const usersSnapshot = await db.collection('users').get();
    const usersByMonth: any = {};
    const userCohorts: any = {};

    // Group users by signup month
    usersSnapshot.docs.forEach((doc: any) => {
      const createdAt = doc.data().createdAt || Date.now();
      const userId = doc.id;
      const plan = doc.data().plan || 'free';

      const signupDate = new Date(createdAt);
      const monthKey = signupDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });

      if (!usersByMonth[monthKey]) {
        usersByMonth[monthKey] = [];
      }
      usersByMonth[monthKey].push({ userId, plan });
    });

    // For each cohort month, calculate retention (% still active)
    for (const [month, users] of Object.entries(usersByMonth)) {
      const cohortUsers = users as any[];
      let stillActive = 0;

      for (const user of cohortUsers) {
        // Check if user has active subscription
        const subDoc = await db
          .collection('subscriptions')
          .doc(user.userId)
          .get();
        const isActive =
          subDoc.exists && subDoc.data()?.status === 'active';

        if (isActive) {
          stillActive++;
        }
      }

      const retentionRate =
        cohortUsers.length > 0
          ? ((stillActive / cohortUsers.length) * 100).toFixed(1)
          : '0';

      userCohorts[month] = {
        signups: cohortUsers.length,
        active: stillActive,
        retention: Number(retentionRate),
      };
    }

    // Convert to array and sort by date
    const cohortData = Object.entries(userCohorts)
      .map(([month, data]: any) => ({
        month,
        ...data,
      }))
      .sort(
        (a, b) =>
          new Date(a.month).getTime() - new Date(b.month).getTime()
      );

    return NextResponse.json({ cohortData });
  } catch (error: any) {
    console.error('Error fetching cohorts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cohorts' },
      { status: 500 }
    );
  }
}
