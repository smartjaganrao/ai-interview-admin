import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';
import { wrapPromotionEmail } from '@/lib/promotionEmail';

export const dynamic = 'force-dynamic';

const BACKEND_API = 'https://javihai.in/api/email/send';
const KNOWN_PLANS = ['free', 'quick_pass', 'pro', 'power'];

/**
 * POST { subject, html, confirm: true, plans?: string[] }
 * Sends the promotion via shared backend API to eligible users (status != 'banned', has email).
 * `plans` filters recipients by their `plan` field — omit or pass an empty array to target every plan.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();

  const { subject, html, confirm, plans, userIds } = await request.json();
  if (!subject?.trim() || !html?.trim()) {
    return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
  }
  if (confirm !== true) {
    return NextResponse.json({ error: 'Missing send confirmation' }, { status: 400 });
  }

  // Explicit user-id targeting (used by re-engagement) takes precedence over plans.
  const explicitIds: string[] = Array.isArray(userIds)
    ? userIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const byUserIds = explicitIds.length > 0;

  // Normalize the plan filter. Empty/absent => all plans.
  const selectedPlans: string[] = Array.isArray(plans)
    ? plans.filter((p: unknown): p is string => typeof p === 'string' && KNOWN_PLANS.includes(p))
    : [];
  const targetAll = !byUserIds && selectedPlans.length === 0;

  const idSet = new Set(explicitIds);
  const usersSnap = await db.collection('users').select('email', 'status', 'plan', 'name').get();

  // Dedupe by lowercased email while keeping the first name we saw for it —
  // a Set<string> here would lose the name needed for {{first_name}}.
  const recipientsByEmail = new Map<string, string>(); // email -> firstName
  usersSnap.docs.forEach((d) => {
    const u = d.data();
    if (u.status === 'banned' || !u.email) return;
    if (byUserIds) { if (!idSet.has(d.id)) return; }
    else if (!targetAll && !selectedPlans.includes((u.plan as string) || 'free')) return;

    const email = (u.email as string).trim().toLowerCase();
    if (recipientsByEmail.has(email)) return;
    const firstName = ((u.name as string) || '').trim().split(/\s+/)[0] || 'there';
    recipientsByEmail.set(email, firstName);
  });

  if (recipientsByEmail.size === 0) {
    return NextResponse.json({ error: 'No eligible recipients found for the selected audience' }, { status: 400 });
  }

  const recipients = Array.from(recipientsByEmail.keys());
  const fullHtml = wrapPromotionEmail(html);
  // The AI template generator (see generate-template/route.ts) writes
  // greetings like "Hi {{first_name}}," on its own initiative — nothing
  // upstream ever told it to, and until now nothing downstream ever
  // substituted it either, so every promotion sent it out verbatim. Replace
  // per-recipient with their actual first name (any casing/spacing inside
  // the braces).
  const FIRST_NAME_PLACEHOLDER = /\{\{\s*first[_\s]?name\s*\}\}/gi;
  const personalizedRecipients = Array.from(recipientsByEmail.entries()).map(([email, firstName]) => ({
    email,
    html: fullHtml.replace(FIRST_NAME_PLACEHOLDER, firstName),
  }));

  try {
    const response = await fetch(BACKEND_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: personalizedRecipients,
        subject: subject.trim(),
        fromName: 'JavihAI',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return NextResponse.json({ error: error.error || 'Email sending failed' }, { status: response.status });
    }

    const result = (await response.json()) as { sent: number; failed: number; total: number };
    const { sent, failed } = result;

    const now = Date.now();
    const audience = byUserIds ? ['segment'] : targetAll ? ['all'] : selectedPlans;

    // Store the full message for audit trail
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
