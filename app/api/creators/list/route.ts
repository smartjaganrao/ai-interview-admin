import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getCached } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';

/** GET — all creators with computed pending balance, newest first. */
export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const firestore = db;
    return getCached('creators:list', 2 * 60 * 1000, async () => {
      const snap = await firestore.collection('creators').orderBy('createdAt', 'desc').limit(500).get();

      const creators = snap.docs.map((doc) => {
        const d = doc.data();
        const totalEarned = d.totalEarned ?? 0;
        const totalPaid = d.totalPaid ?? 0;
        return {
          id: doc.id,
          code: (d.code || '') as string,
          name: (d.name || '') as string,
          email: (d.email || '') as string,
          status: (d.status || 'active') as string,
          commissionBps: (d.commissionBps ?? 2000) as number,
          payoutUpi: (d.payoutUpi || '') as string,
          referredCount: (d.referredCount ?? 0) as number,
          totalEarned,
          totalPaid,
          pending: Math.max(0, totalEarned - totalPaid),
          createdAt: (d.createdAt || 0) as number,
        };
      });

      return NextResponse.json({ creators, total: creators.length });
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch creators';
    console.error('[creators/list]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
