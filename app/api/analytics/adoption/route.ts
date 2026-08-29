import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getCachedActivityMap, segmentFor, type Segment } from '@/lib/usage-activity';
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
        getCachedActivityMap(),
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

      if (auth) {
        const missing = users.filter(u => !u.email || !u.name);
        if (missing.length > 0) {
          const authClient = auth;
          const results = await Promise.allSettled(
            missing.map(u => authClient.getUser(u.id).catch(() => null))
          );
          results.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value) {
              const fb = result.value;
              if (!missing[i].email && fb.email) missing[i].email = fb.email;
              if (!missing[i].name && fb.displayName) missing[i].name = fb.displayName;
            }
          });
        }
      }

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
