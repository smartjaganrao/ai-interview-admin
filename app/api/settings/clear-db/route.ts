import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

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

async function deleteCollectionExcluding(colPath: string, excludeId: string, batchSize = 400) {
  if (!db) return 0;
  let deleted = 0;
  while (true) {
    const snap = await db.collection(colPath).limit(batchSize).get();
    const docs = snap.docs.filter(d => d.id !== excludeId);
    if (docs.length === 0) break;
    const batch = db.batch();
    docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += docs.length;
    // If the only doc left in this page was the excluded one, we're done.
    if (snap.size === 1 && snap.docs[0].id === excludeId) break;
  }
  return deleted;
}

export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 503 });
  }

  // Same session shape every other admin route uses — a plain JSON cookie
  // set by /api/auth/login, NOT a Firebase-signed session cookie. The
  // previous check called auth.verifySessionCookie() on this value, which
  // always threw "Invalid session" since it's the wrong cookie format
  // entirely — this endpoint never worked, regardless of who was logged in.
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'super-admin') {
    return NextResponse.json({ error: 'Forbidden — super-admin only' }, { status: 403 });
  }
  const callerUid = session.uid;

  const { confirm } = await req.json();
  if (confirm !== 'DELETE ALL DATA') {
    return NextResponse.json({ error: 'Confirmation text mismatch' }, { status: 400 });
  }

  // usage_tracking has subcollections (usage_tracking/{uid}/days/*) that Firestore
  // does not cascade-delete; use recursiveDelete for it.
  const DEEP_COLLECTIONS = new Set(['usage_tracking']);

  const results: Record<string, number> = {};
  for (const col of COLLECTIONS) {
    if (col === 'users') {
      // Never wipe the calling admin's own profile doc — this has already
      // locked the founder out once when a different reset path did this.
      results[col] = await deleteCollectionExcluding(col, callerUid);
    } else {
      results[col] = await (DEEP_COLLECTIONS.has(col)
        ? deleteCollectionDeep(col)
        : deleteCollection(col));
    }
  }

  const total = Object.values(results).reduce((a, b) => a + b, 0);
  return NextResponse.json({ ok: true, total, results });
}
