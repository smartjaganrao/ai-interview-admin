import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getCached, invalidateCache } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';

const mask = (v?: string) =>
  v ? `${v.slice(0, 8)}${'•'.repeat(Math.max(0, v.length - 12))}${v.slice(-4)}` : '';

/** GET — return current API key config (masked) */
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const firestore = db;
  return getCached('settings:api-keys', 2 * 60 * 1000, async () => {
    const doc = await firestore.collection('settings').doc('api_keys').get();
    const data = doc.exists ? doc.data() : {};

    return NextResponse.json({
      groqKeySet:       !!data?.groqApiKey,
      groqKeyMasked:    mask(data?.groqApiKey),
      rzpKeyIdSet:      !!data?.razorpayKeyId,
      rzpKeyIdMasked:   mask(data?.razorpayKeyId),
      rzpSecretSet:     !!data?.razorpayKeySecret,
      rzpSecretMasked:  mask(data?.razorpayKeySecret),
      resendKeySet:     !!data?.resendApiKey,
      resendKeyMasked:  mask(data?.resendApiKey),
      resendFromEmail:  data?.resendFromEmail ?? '',
      updatedAt:        data?.updatedAt ?? null,
      updatedBy:        data?.updatedBy ?? null,
    });
  });
}

/** POST — save one or more keys { groqApiKey?, razorpayKeyId?, razorpayKeySecret? } */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const body = await req.json();
  const { groqApiKey, razorpayKeyId, razorpayKeySecret, resendApiKey, resendFromEmail } = body;

  const update: Record<string, unknown> = { updatedAt: Date.now() };
  const details: Record<string, string> = {};

  if (groqApiKey !== undefined) {
    if (!groqApiKey || !groqApiKey.startsWith('gsk_')) {
      return NextResponse.json({ error: 'Invalid Groq API key — must start with gsk_' }, { status: 400 });
    }
    update.groqApiKey = groqApiKey;
    details.groqApiKey = `${groqApiKey.slice(0,8)}…${groqApiKey.slice(-4)}`;
  }

  if (razorpayKeyId !== undefined) {
    if (!razorpayKeyId || !razorpayKeyId.startsWith('rzp_')) {
      return NextResponse.json({ error: 'Invalid Razorpay Key ID — must start with rzp_' }, { status: 400 });
    }
    update.razorpayKeyId = razorpayKeyId;
    details.razorpayKeyId = `${razorpayKeyId.slice(0,8)}…${razorpayKeyId.slice(-4)}`;
  }

  if (razorpayKeySecret !== undefined) {
    if (!razorpayKeySecret || razorpayKeySecret.length < 10) {
      return NextResponse.json({ error: 'Invalid Razorpay Key Secret' }, { status: 400 });
    }
    update.razorpayKeySecret = razorpayKeySecret;
    details.razorpayKeySecret = `${razorpayKeySecret.slice(0,4)}…${razorpayKeySecret.slice(-4)}`;
  }

  if (resendApiKey !== undefined) {
    if (!resendApiKey || !resendApiKey.startsWith('re_')) {
      return NextResponse.json({ error: 'Invalid Resend API key — must start with re_' }, { status: 400 });
    }
    update.resendApiKey = resendApiKey;
    details.resendApiKey = `${resendApiKey.slice(0,6)}…${resendApiKey.slice(-4)}`;
  }

  if (resendFromEmail !== undefined) {
    const from = String(resendFromEmail).trim();
    // Accept either "name@domain" or "Display Name <name@domain>".
    if (!from || !/.+@.+\..+/.test(from)) {
      return NextResponse.json({ error: 'Invalid From email address' }, { status: 400 });
    }
    update.resendFromEmail = from;
    details.resendFromEmail = from;
  }

  if (Object.keys(details).length === 0) {
    return NextResponse.json({ error: 'No valid keys provided' }, { status: 400 });
  }

  // Extract admin email from session cookie
  const sessionHeader = req.headers.get('cookie') ?? '';
  const sessionMatch = sessionHeader.match(/admin-session=([^;]+)/);
  let adminEmail = 'admin';
  try {
    if (sessionMatch) adminEmail = JSON.parse(decodeURIComponent(sessionMatch[1])).email ?? 'admin';
  } catch { /* ignore */ }

  update.updatedBy = adminEmail;

  await db.collection('settings').doc('api_keys').set(update, { merge: true });

  invalidateCache('settings:api-keys');

  await db.collection('admin_logs').add({
    adminUid: 'admin',
    adminEmail,
    action: 'api_key_update',
    targetUserId: 'system',
    details,
    timestamp: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
