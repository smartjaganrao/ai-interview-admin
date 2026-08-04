import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getActivityMap, segmentFor, type Segment } from '@/lib/usage-activity';
import { getCached } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';

interface AdoptionUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  createdAt: number;
  lastActive: number;
  activeDays: number;
  tokensUsed: number;
  voiceMinutes: number;
  screenshotsUsed: number;
  mockSessions: number;
  segment: Segment;
}

/**
 * GET — desktop-app adoption funnel. For every registered (non-banned) user,
 * joins their usage_tracking activity and classifies them as:
 *   never    — signed up, never used the desktop app
 *   active7  — used in the last 7 days
 *   active30 — used in the last 30 days (but not last 7)
 *   dormant  — used at some point, but not in 30+ days (churn risk)
 */
export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const firestore = db;
    return getCached('analytics:adoption', 15 * 60 * 1000, async () => {
      const [usersSnap, activity] = await Promise.all([
        firestore.collection('users').select('email', 'name', 'plan', 'status', 'createdAt', 'lastSeen').get(),
        getActivityMap(),
      ]);

      const now = Date.now();
      const counts: Record<Segment, number> = { active7: 0, active30: 0, dormant: 0, never: 0 };
      const users: AdoptionUser[] = [];

      for (const doc of usersSnap.docs) {
        const u = doc.data();
        if (u.status === 'banned') continue;

        const act = activity.get(doc.id);
        const lastActive = Math.max(act?.lastActive ?? 0, (u.lastSeen as number) || 0);
        const segment = segmentFor(lastActive, now);
        counts[segment] += 1;

        users.push({
          id: doc.id,
          email: (u.email as string) || '',
          name: (u.name as string) || '',
          plan: (u.plan as string) || 'free',
          createdAt: (u.createdAt as number) || 0,
          lastActive,
          activeDays: act?.activeDays ?? 0,
          tokensUsed: act?.tokensUsed ?? 0,
          voiceMinutes: act?.voiceMinutes ?? 0,
          screenshotsUsed: act?.screenshotsUsed ?? 0,
          mockSessions: act?.mockSessions ?? 0,
          segment,
        });
      }

      const totalUsers = users.length;
      const activated = totalUsers - counts.never;
      const activationRate = totalUsers > 0 ? Math.round((activated / totalUsers) * 100) : 0;

      users.sort((a, b) => b.lastActive - a.lastActive);

      return NextResponse.json({
        totalUsers,
        activated,
        activationRate,
        counts,
        users,
      });
    });
  } catch (error) {
    console.error('Error fetching adoption data:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch adoption data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
