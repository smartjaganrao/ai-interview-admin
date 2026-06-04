import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/** GET — return current API key config (masked) */
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const doc = await db.collection('settings').doc('api_keys').get();
  const data = doc.exists ? doc.data() : {};

  // Mask the key so it never leaves server as plaintext
  const mask = (v?: string) => v ? `${v.slice(0, 8)}${'•'.repeat(Math.max(0, v.length - 12))}${v.slice(-4)}` : '';

  return NextResponse.json({
    groqKeySet: !!data?.groqApiKey,
    groqKeyMasked: mask(data?.groqApiKey),
    updatedAt: data?.updatedAt ?? null,
    updatedBy: data?.updatedBy ?? null,
  });
}

/** POST { groqApiKey } — save/update the Groq API key */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

  const { groqApiKey } = await req.json();
  if (!groqApiKey || typeof groqApiKey !== 'string' || !groqApiKey.startsWith('gsk_')) {
    return NextResponse.json({ error: 'Invalid Groq API key — must start with gsk_' }, { status: 400 });
  }

  const sessionHeader = req.headers.get('cookie') ?? '';
  const sessionMatch = sessionHeader.match(/admin-session=([^;]+)/);
  let adminEmail = 'admin';
  try {
    if (sessionMatch) adminEmail = JSON.parse(decodeURIComponent(sessionMatch[1])).email ?? 'admin';
  } catch { /* ignore */ }

  await db.collection('settings').doc('api_keys').set({
    groqApiKey,
    updatedAt: Date.now(),
    updatedBy: adminEmail,
  }, { merge: true });

  // Audit log
  await db.collection('admin_logs').add({
    adminUid: 'admin',
    adminEmail,
    action: 'api_key_update',
    targetUserId: 'system',
    details: { key: 'groqApiKey', masked: `${groqApiKey.slice(0,8)}…${groqApiKey.slice(-4)}` },
    timestamp: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
