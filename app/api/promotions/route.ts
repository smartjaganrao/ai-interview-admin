import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/** GET — current draft, recent send history, and the eligible-recipient count. */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const draftDoc = await db.collection('promotions').doc('draft').get();
  const historySnap = await db.collection('promotion_sends').orderBy('sentAt', 'desc').limit(20).get();
  const history = historySnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const usersSnap = await db.collection('users').select('email', 'status', 'plan').get();
  const eligible = usersSnap.docs.filter(
    (d) => d.data().status !== 'banned' && !!d.data().email
  );
  const planCounts: Record<string, number> = { free: 0, pro: 0, power: 0 };
  for (const d of eligible) {
    const plan = (d.data().plan as string) || 'free';
    if (plan in planCounts) planCounts[plan] += 1;
  }

  return NextResponse.json({
    draft: draftDoc.exists ? draftDoc.data() : null,
    history,
    recipientCount: eligible.length,
    planCounts,
  });
}

/** POST { subject, html } — save (overwrite) the single promotion draft. */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();

  const { subject, html } = await request.json();
  if (!subject?.trim() || !html?.trim()) {
    return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
  }

  await db.collection('promotions').doc('draft').set({
    subject: subject.trim(),
    html,
    updatedAt: Date.now(),
    updatedBy: session?.email || 'system',
  });

  return NextResponse.json({ ok: true });
}
