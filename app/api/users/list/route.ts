import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';

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
    const snapshot = await queryRef.orderBy('createdAt', 'desc').limit(500).get();

    let users = snapshot.docs.map((doc) => ({
      id:        doc.id,
      email:     (doc.data().email     || '') as string,
      name:      (doc.data().name      || '') as string,
      plan:      (doc.data().plan      || 'free') as string,
      status:    (doc.data().status    || 'active') as string,
      createdAt: (doc.data().createdAt || 0) as number,
      phone:           (doc.data().phone           || '') as string,
      experienceLevel: (doc.data().experienceLevel || '') as string,
      city:            (doc.data().city            || '') as string,
      referralSource:  (doc.data().referralSource  || '') as string,
    }));

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
    const stats = {
      total: totalAgg.data().count,
      banned: bannedAgg.data().count,
      paid: paidAgg.data().count,
      active: totalAgg.data().count - bannedAgg.data().count,
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
