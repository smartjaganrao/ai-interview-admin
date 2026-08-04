import { NextRequest, NextResponse } from 'next/server';
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

      // Get API usage by week (last 12 weeks)
      const usageByWeek: Record<string, { tokens: number; voiceMinutes: number; screenshots: number }> = {};
      const now = new Date();

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

        // Get all usage records for this week
        const usageSnapshot = await firestore
          .collectionGroup('months')
          .where('timestamp', '>=', weekStart.getTime())
          .where('timestamp', '<', weekEnd.getTime())
          .get();

        let tokens = 0;
        let voiceMinutes = 0;
        let screenshots = 0;

        usageSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          tokens += data.tokensUsed || 0;
          voiceMinutes += data.voiceMinutes || 0;
          screenshots += data.screenshotsUsed || 0;
        });

        usageByWeek[weekKey] = {
          tokens: Math.round(tokens / 1000), // Convert to thousands for chart
          voiceMinutes: Math.round(voiceMinutes),
          screenshots: screenshots,
        };
      }

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
