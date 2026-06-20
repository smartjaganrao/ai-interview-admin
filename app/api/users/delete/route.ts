import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

const USER_COLLECTIONS = [
  'subscriptions', 'usage_tracking', 'referrals',
  'credit_redemptions', 'creator_attributions', 'creator_commissions', 'orders',
];

async function deleteUserData(userId: string) {
  if (!db) return;
  const batch = db.batch();

  // Delete top-level user doc
  batch.delete(db.collection('users').doc(userId));

  // Delete related docs in other collections
  for (const col of USER_COLLECTIONS) {
    const snap = await db.collection(col).where('userId', '==', userId).get();
    snap.docs.forEach(d => batch.delete(d.ref));
  }

  await batch.commit();

  // Delete subcollections (usage_tracking/{uid}/days/*)
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
