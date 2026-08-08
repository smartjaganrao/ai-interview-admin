import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';
import { getCached } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    const firestore = db;
    return getCached('analytics:cohorts', 15 * 60 * 1000, async () => {
      const usersSnapshot = await firestore.collection('users').get();
      const usersByMonth: Record<string, { userId: string; plan: string }[]> = {};
      const userCohorts: Record<string, { signups: number; active: number; retention: number }> = {};

      usersSnapshot.docs.forEach((doc) => {
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

      // Batch-fetch all subscription docs for this cohort instead of N+1
      const allUserIds = usersSnapshot.docs.map(d => d.id);
      const subPromises = allUserIds.map(uid =>
        firestore.collection('subscriptions').doc(uid).get().catch(() => null)
      );
      const subSnaps = await Promise.all(subPromises);
      const subMap = new Map<string, { status?: string }>();
      subSnaps.forEach((snap, idx) => {
        if (snap?.exists) {
          const d = snap.data() as Record<string, unknown>;
          subMap.set(allUserIds[idx], { status: (d.status as string) || 'inactive' });
        }
      });

      for (const [month, users] of Object.entries(usersByMonth)) {
        const cohortUsers = users as { userId: string; plan: string }[];
        let stillActive = 0;

        for (const user of cohortUsers) {
          const sub = subMap.get(user.userId);
          const isActive = sub?.status === 'active';
          if (isActive) stillActive++;
        }

        const retentionRate = cohortUsers.length > 0 ? ((stillActive / cohortUsers.length) * 100).toFixed(1) : '0';

        userCohorts[month] = {
          signups: cohortUsers.length,
          active: stillActive,
          retention: Number(retentionRate),
        };
      }

      const cohortData = Object.entries(userCohorts)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      return NextResponse.json({ cohortData });
    });
  } catch (error) {
    console.error('Error fetching cohorts:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch cohorts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
