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

    return getCached('analytics:api-usage', 15 * 60 * 1000, async () => {
      const firestore = db!;

      // Get API usage by week (last 12 weeks) — single collectionGroup scan
      // instead of 12 separate per-week queries. Each day doc is read once
      // and bucketed client-side, cutting listener/read cost ~12x.
      const now = new Date();
      const twelveWeeksAgo = new Date(now);
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 11 * 7);
      twelveWeeksAgo.setHours(0, 0, 0, 0);
      const cutoff = twelveWeeksAgo.getTime();

      const usageSnapshot = await firestore.collectionGroup('days').get();

      const usageByWeek: Record<string, { tokens: number; voiceMinutes: number; screenshots: number }> = {};

      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - i * 7);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekKey = weekStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        usageByWeek[weekKey] = { tokens: 0, voiceMinutes: 0, screenshots: 0 };
      }

      usageSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const ts = (data.lastUpdated as number | undefined) || 0;
        if (!ts || ts < cutoff) return;

        for (let i = 11; i >= 0; i--) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - i * 7);
          weekStart.setHours(0, 0, 0, 0);

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          if (ts >= weekStart.getTime() && ts < weekEnd.getTime()) {
            const weekKey = weekStart.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            const bucket = usageByWeek[weekKey];
            if (bucket) {
              bucket.tokens += (data.tokensUsed as number) || 0;
              bucket.voiceMinutes += (data.voiceMinutes as number) || 0;
              bucket.screenshots += (data.screenshotsUsed as number) || 0;
            }
            break;
          }
        }
      });

      // Convert to array format for charts
      const usageData = Object.entries(usageByWeek).map(([week, usage]) => ({
        week,
        ...usage,
      }));

      return NextResponse.json({ usageData });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch API usage';
    const isIndexError = message.includes('FAILED_PRECONDITION') && message.includes('index');
    if (!isIndexError) {
      console.error('Error fetching API usage:', error);
    }
    return NextResponse.json({
      usageData: [],
      ...(isIndexError ? { note: 'API usage tracking index not yet available' } : { note: 'API usage tracking not yet populated' }),
    });
  }
}
