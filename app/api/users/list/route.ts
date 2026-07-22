import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getActivityMap, segmentFor } from '@/lib/usage-activity';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit  = Math.min(100, parseInt(searchParams.get('limit') || '50'));
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const plan   = searchParams.get('plan') || '';

    let queryRef: FirebaseFirestore.Query = db.collection('users');

    if (plan && plan !== 'all') {
      queryRef = queryRef.where('plan', '==', plan);
    }

    // Fetch ALL matching users so search applies BEFORE pagination (bug fix:
    // previously search was applied after offset/limit, hiding results).
    // Capped at 500 to avoid unbounded reads; increase if needed.
    //
    // Deliberately NOT using .orderBy('createdAt', 'desc') here — Firestore
    // silently excludes any document missing the ordered field from the
    // result set entirely (it doesn't sort it last, it just isn't returned).
    // Any user doc written without createdAt (partial signup, a webhook
    // race, an admin-created doc) would vanish from this list while still
    // being counted by the .count() aggregates below — exactly the "total
    // says 24, list shows 20, newest users missing" bug. Sorting in memory
    // with a guaranteed fallback (Firestore's own doc-creation time) means
    // every user is always included.
    const [snapshot, activity] = await Promise.all([
      queryRef.limit(500).get(),
      getActivityMap(),
    ]);

    let users = snapshot.docs.map((doc) => ({
      id:        doc.id,
      email:     (doc.data().email     || '') as string,
      name:      (doc.data().name      || '') as string,
      plan:      (doc.data().plan      || 'free') as string,
      status:    (doc.data().status    || 'active') as string,
      createdAt: (doc.data().createdAt as number) || doc.createTime.toMillis(),
      phone:           (doc.data().phone           || '') as string,
      experienceLevel: (doc.data().experienceLevel || '') as string,
      city:            (doc.data().city            || '') as string,
      referralSource:  (doc.data().referralSource  || '') as string,
      lastActive:      Math.max(activity.get(doc.id)?.lastActive ?? 0, (doc.data().lastSeen || 0) as number),
      activeDays:      activity.get(doc.id)?.activeDays ?? 0,
      tokensUsed:      activity.get(doc.id)?.tokensUsed ?? 0,
      voiceMinutes:    activity.get(doc.id)?.voiceMinutes ?? 0,
      screenshotsUsed: activity.get(doc.id)?.screenshotsUsed ?? 0,
      mockSessions:    activity.get(doc.id)?.mockSessions ?? 0,
    }));

    users.sort((a, b) => b.createdAt - a.createdAt);

    // Apply search filter server-side before pagination
    if (search) {
      users = users.filter(
        (u) => u.email.toLowerCase().includes(search) || u.name.toLowerCase().includes(search)
      );
    }

    const total    = users.length;
    const offset   = (page - 1) * limit;
    const paginated = users.slice(offset, offset + limit);

    // True counts across the WHOLE collection (not the 500-doc page-fetch
    // cap above, and not the current plan/search filter) — so the stat
    // cards on this page always agree with Analytics, which uses the same
    // kind of unfiltered aggregate.
    const [totalAgg, bannedAgg, paidAgg] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('users').where('status', '==', 'banned').count().get(),
      db.collection('users').where('plan', 'in', ['pro', 'power']).count().get(),
    ]);
    // "Active" means actually used the desktop app recently (last 30 days),
    // not merely "not banned" — the previous total-minus-banned formula
    // made this stat always equal Total, even when every visible row said
    // "Never used". `activity` already holds every user with at least one
    // usage day (from the collectionGroup('days') read above), so this is
    // a real signal computed with no extra reads.
    const now = Date.now();
    let activeCount = 0;
    for (const a of activity.values()) {
      const segment = segmentFor(a.lastActive, now);
      if (segment === 'active7' || segment === 'active30') activeCount++;
    }
    const stats = {
      total: totalAgg.data().count,
      banned: bannedAgg.data().count,
      paid: paidAgg.data().count,
      active: activeCount,
    };

    return NextResponse.json({
      users:   paginated,
      total,
      stats,
      page,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    console.error('[users/list]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
