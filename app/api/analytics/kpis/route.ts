import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getCached } from '@/lib/route-cache';
import { computeKpis } from '@/lib/kpis';

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

    return getCached('analytics:kpis', 5 * 60 * 1000, () => computeKpis()).then((data) => {
      return NextResponse.json(data);
    }).catch((error) => {
      console.error('[analytics/kpis] cache fetch error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to fetch KPIs' },
        { status: 500 }
      );
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch KPIs';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
