import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

// User data collections to wipe.
// Intentionally EXCLUDED (important config):
//   settings  — Groq API key, app config
//   pricing   — plan prices & active offers
const COLLECTIONS = [
  'users',
  'subscriptions',
  'usage_tracking',
  'referrals',
  'credit_redemptions',
  'creators',
  'creator_attributions',
  'creator_commissions',
  'orders',
  'admin_logs',
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

// For collections with subcollections (e.g. usage_tracking/{uid}/days/*), Firestore
// does not cascade document deletes to subcollections. Use recursiveDelete which
// walks the full subtree. Count top-level docs first for the result display.
async function deleteCollectionDeep(colPath: string): Promise<number> {
  if (!db) return 0;
  const snap = await db.collection(colPath).get();
  const count = snap.size;
  if (count > 0) {
    await db.recursiveDelete(db.collection(colPath));
  }
  return count;
}

export async function POST(req: NextRequest) {
  if (!db || !auth) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 503 });
  }

  // Verify super-admin session cookie
  const cookie = req.cookies.get('admin-session')?.value;
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

  // usage_tracking has subcollections (usage_tracking/{uid}/days/*) that Firestore
  // does not cascade-delete; use recursiveDelete for it.
  const DEEP_COLLECTIONS = new Set(['usage_tracking']);

  const results: Record<string, number> = {};
  for (const col of COLLECTIONS) {
    results[col] = await (DEEP_COLLECTIONS.has(col)
      ? deleteCollectionDeep(col)
      : deleteCollection(col));
  }

  const total = Object.values(results).reduce((a, b) => a + b, 0);
  return NextResponse.json({ ok: true, total, results });
}
