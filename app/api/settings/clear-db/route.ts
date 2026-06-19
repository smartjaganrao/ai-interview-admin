import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

// Collections to wipe. Adjust the list if you add new top-level collections.
const COLLECTIONS = [
  'subscriptions',
  'usage_tracking',
  'referrals',
  'referral_codes',
  'creators',
  'orders',
  'audit_logs',
  'user_profiles',
  'support_tickets',
];

async function deleteCollection(colPath: string, batchSize = 400) {
  if (!db) return 0;
  let deleted = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db.collection(colPath).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
  return deleted;
}

export async function POST(req: NextRequest) {
  if (!db || !auth) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 503 });
  }

  // Verify super-admin session cookie
  const cookie = req.cookies.get('admin_session')?.value;
  if (!cookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = await auth.verifySessionCookie(cookie, true);
    const user = await auth.getUser(decoded.uid);
    const role = (user.customClaims as Record<string, string> | undefined)?.role;
    if (role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden — super-admin only' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { confirm } = await req.json();
  if (confirm !== 'DELETE ALL DATA') {
    return NextResponse.json({ error: 'Confirmation text mismatch' }, { status: 400 });
  }

  const results: Record<string, number> = {};
  for (const col of COLLECTIONS) {
    results[col] = await deleteCollection(col);
  }

  const total = Object.values(results).reduce((a, b) => a + b, 0);
  return NextResponse.json({ ok: true, total, results });
}
