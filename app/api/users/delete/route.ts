import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

// Collections keyed by userId as the document ID itself — a where('userId',...)
// query against these never matches anything (there's no such field), so the
// old code silently left them behind on every delete. subscriptions in
// particular kept counting toward MRR forever after the "user" was gone.
const COLLECTIONS_BY_DOC_ID = ['subscriptions', 'creator_attributions'];

// Collections that do carry a real userId field, safe to query directly.
const COLLECTIONS_BY_USERID_FIELD = ['creator_commissions', 'orders'];

async function deleteUserData(userId: string) {
  if (!db) return;
  const batch = db.batch();

  // Delete top-level user doc
  batch.delete(db.collection('users').doc(userId));

  for (const col of COLLECTIONS_BY_DOC_ID) {
    batch.delete(db.collection(col).doc(userId));
  }

  for (const col of COLLECTIONS_BY_USERID_FIELD) {
    const snap = await db.collection(col).where('userId', '==', userId).get();
    snap.docs.forEach(d => batch.delete(d.ref));
  }

  // credit_redemptions stores the field as `uid`, not `userId`
  const creditSnap = await db.collection('credit_redemptions').where('uid', '==', userId).get();
  creditSnap.docs.forEach(d => batch.delete(d.ref));

  // referrals records this user under whichever side they were —
  // referrerUid or refereeUid, never a generic userId
  for (const field of ['referrerUid', 'refereeUid']) {
    const snap = await db.collection('referrals').where(field, '==', userId).get();
    snap.docs.forEach(d => batch.delete(d.ref));
  }

  await batch.commit();

  // Delete subcollections (usage_tracking/{uid}/months/*) — also doc-ID-keyed,
  // handled separately because deleting a doc with subcollections needs
  // recursiveDelete rather than a plain batch delete.
  try {
    await db.recursiveDelete(db.collection('usage_tracking').doc(userId));
  } catch { /* ignore if not exists */ }
}

/**
 * POST { userIds: string[] } — delete one or many users
 * POST { deleteAll: true }  — delete ALL users
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db || !auth) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    const session = await getSession();
    const body = await request.json();

    let userIds: string[] = [];

    if (body.deleteAll === true) {
      const snap = await db.collection('users').get();
      userIds = snap.docs.map(d => d.id);
    } else {
      userIds = body.userIds || [];
    }

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'No users specified' }, { status: 400 });
    }

    let deleted = 0;
    let failed = 0;

    for (const uid of userIds) {
      try {
        await deleteUserData(uid);
        // Delete Firebase Auth account
        try { await auth.deleteUser(uid); } catch { /* auth account may not exist */ }
        deleted++;
      } catch {
        failed++;
      }
    }

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: body.deleteAll ? 'delete_all_users' : 'delete_users',
      details: { requested: userIds.length, deleted, failed },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ ok: true, deleted, failed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    console.error('[users/delete]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
