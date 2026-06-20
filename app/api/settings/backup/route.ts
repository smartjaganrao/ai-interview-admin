import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

// Flat (non-subcollection) collections backed up wholesale.
// usage_tracking is handled separately below — it has a months/ subcollection
// per user that Firestore does not include in a plain collection().get().
const COLLECTIONS = [
  'users', 'subscriptions', 'referrals', 'credit_redemptions',
  'creators', 'creator_attributions', 'creator_commissions', 'creator_payouts',
  'orders', 'admin_logs', 'support_tickets', 'settings', 'pricing',
];

async function requireSuperAdmin() {
  const session = await getSession();
  return session?.isAdmin && session.role === 'super-admin' ? session : null;
}

/** Firestore Timestamp -> ISO string, recursively, so the export is plain JSON. */
function serialize(v: unknown): unknown {
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown> & { toDate?: () => Date };
    if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
    if (Array.isArray(v)) return v.map(serialize);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(obj)) out[k] = serialize(val);
    return out;
  }
  return v;
}

interface DocRecord { id: string; data: unknown }
interface UsageRecord extends DocRecord { months: DocRecord[] }

/** GET — export every collection to a downloadable JSON file. */
export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden — super-admin only' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const collections: Record<string, DocRecord[]> = {};
  for (const col of COLLECTIONS) {
    const snap = await db.collection(col).get();
    collections[col] = snap.docs.map(d => ({ id: d.id, data: serialize(d.data()) }));
  }

  // usage_tracking/{uid}/months/{YYYY-MM}
  const usageSnap = await db.collection('usage_tracking').get();
  const usage: UsageRecord[] = [];
  for (const doc of usageSnap.docs) {
    const monthsSnap = await doc.ref.collection('months').get();
    usage.push({
      id: doc.id,
      data: serialize(doc.data()),
      months: monthsSnap.docs.map(m => ({ id: m.id, data: serialize(m.data()) })),
    });
  }
  collections.usage_tracking = usage;

  const payload = {
    exportedAt: Date.now(),
    exportedBy: session.email,
    collections,
  };

  await db.collection('admin_logs').add({
    adminUid: session.uid, adminEmail: session.email, action: 'db_export',
    details: { collectionCounts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length])) },
    timestamp: Date.now(),
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="javihai-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

/** POST { collections } — restore from a previously exported backup file. Overwrites matching docs. */
export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden — super-admin only' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const collections = body?.collections as Record<string, DocRecord[] | UsageRecord[]> | undefined;
  if (!collections || typeof collections !== 'object') {
    return NextResponse.json({ error: 'Invalid backup file — missing "collections"' }, { status: 400 });
  }

  const results: Record<string, number> = {};
  let restored = 0;

  for (const [colName, docs] of Object.entries(collections)) {
    if (!Array.isArray(docs)) continue;

    if (colName === 'usage_tracking') {
      for (const item of docs as UsageRecord[]) {
        const ref = db.collection('usage_tracking').doc(item.id);
        await ref.set((item.data as Record<string, unknown>) || {});
        if (Array.isArray(item.months) && item.months.length > 0) {
          const batch = db.batch();
          for (const m of item.months) batch.set(ref.collection('months').doc(m.id), m.data as Record<string, unknown>);
          await batch.commit();
        }
      }
      results[colName] = docs.length;
      restored += docs.length;
      continue;
    }

    let count = 0;
    // Firestore batched writes cap at 500 ops — chunk to stay safely under that.
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = (docs as DocRecord[]).slice(i, i + 400);
      const batch = db.batch();
      for (const item of chunk) {
        batch.set(db.collection(colName).doc(item.id), item.data as Record<string, unknown>);
        count++;
      }
      await batch.commit();
    }
    results[colName] = count;
    restored += count;
  }

  await db.collection('admin_logs').add({
    adminUid: session.uid, adminEmail: session.email, action: 'db_restore',
    details: { restored, results }, timestamp: Date.now(),
  });

  return NextResponse.json({ ok: true, restored, results });
}
