import { NextRequest, NextResponse } from 'next/server';
import { computeKpis } from '@/lib/kpis';
import { sendMrrDigest } from '@/lib/digest-email';

export const dynamic = 'force-dynamic';

// Vercel Cron calls this route (configured in vercel.json) once a day.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const kpis = await computeKpis();
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const result = await sendMrrDigest(kpis, date);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, kpis });
  } catch (error) {
    console.error('[cron/mrr-digest] failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to send digest';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
