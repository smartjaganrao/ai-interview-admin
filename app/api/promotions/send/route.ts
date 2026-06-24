import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';
import { wrapPromotionEmail } from '@/lib/promotionEmail';
import { getResendConfig } from '@/lib/resend-server';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 100; // Resend batch.send cap
const BATCH_DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const KNOWN_PLANS = ['free', 'pro', 'power'];

/**
 * POST { subject, html, confirm: true, plans?: string[] }
 * Sends the promotion to eligible users (status != 'banned', has email).
 * `plans` filters recipients by their `plan` field — omit or pass an empty
 * array to target every plan.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const resendConfig = await getResendConfig();
  if (!resendConfig) {
    return NextResponse.json({ error: 'Email sending is not configured. Add a Resend API key in Settings → API Keys.' }, { status: 500 });
  }
  const session = await getSession();

  const { subject, html, confirm, plans } = await request.json();
  if (!subject?.trim() || !html?.trim()) {
    return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
  }
  if (confirm !== true) {
    return NextResponse.json({ error: 'Missing send confirmation' }, { status: 400 });
  }

  // Normalize the plan filter. Empty/absent => all plans.
  const selectedPlans: string[] = Array.isArray(plans)
    ? plans.filter((p: unknown): p is string => typeof p === 'string' && KNOWN_PLANS.includes(p))
    : [];
  const targetAll = selectedPlans.length === 0;

  const usersSnap = await db.collection('users').select('email', 'status', 'plan').get();
  const recipients = Array.from(
    new Set(
      usersSnap.docs
        .filter((d) => {
          const u = d.data();
          if (u.status === 'banned' || !u.email) return false;
          if (targetAll) return true;
          return selectedPlans.includes((u.plan as string) || 'free');
        })
        .map((d) => (d.data().email as string).trim().toLowerCase())
    )
  );

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No eligible recipients found for the selected plans' }, { status: 400 });
  }

  const resend = new Resend(resendConfig.apiKey);
  const FROM = resendConfig.fromEmail;
  const fullHtml = wrapPromotionEmail(html);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await resend.batch.send(
        chunk.map((to) => ({ from: FROM, to, subject: subject.trim(), html: fullHtml }))
      );
      if (error) {
        failed += chunk.length;
      } else {
        sent += chunk.length;
      }
    } catch {
      failed += chunk.length;
    }
    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  const now = Date.now();
  const audience = targetAll ? ['all'] : selectedPlans;
  // Store the full message (subject + html body + recipient emails) so every
  // sent promotion is permanently auditable, not just its counts.
  const sendRef = await db.collection('promotion_sends').add({
    subject: subject.trim(),
    html,
    audience,
    recipients,
    recipientCount: recipients.length,
    sent,
    failed,
    sentAt: now,
    sentBy: session?.email || 'system',
  });

  await db.collection('admin_logs').add({
    adminUid: session?.uid || 'system',
    adminEmail: session?.email || 'system',
    action: 'promotion_send',
    targetId: sendRef.id,
    details: { subject: subject.trim(), audience, recipientCount: recipients.length, sent, failed },
    timestamp: now,
  });

  return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
}
