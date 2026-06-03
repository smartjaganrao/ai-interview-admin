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

    return NextResponse.json({
      users:   paginated,
      total,
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
