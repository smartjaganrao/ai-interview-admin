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
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || '';

    const pageSize = Math.min(limit, 100); // Max 100 per page
    const offset = (page - 1) * pageSize;

    // Build base collection reference
    const usersCollection = db.collection('users');

    // Build query with filters
    let queryRef: any = usersCollection;

    if (plan && plan !== 'all') {
      queryRef = queryRef.where('plan', '==', plan);
    }

    // Get total count
    const countSnapshot = await queryRef.count().get();
    const totalCount = countSnapshot.data().count;

    // Fetch users with pagination
    const snapshot = await queryRef
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(pageSize)
      .get();

    const users = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      email: doc.data().email || '',
      name: doc.data().name || '',
      plan: doc.data().plan || 'free',
      status: doc.data().status || 'active',
      createdAt: doc.data().createdAt || 0,
      settings: doc.data().settings || {},
    }));

    // Filter by search term (client-side for simplicity)
    const filtered = users.filter(
      (user: any) =>
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.name.toLowerCase().includes(search.toLowerCase())
    );

    return NextResponse.json({
      users: filtered,
      total: totalCount,
      page,
      limit: pageSize,
      hasMore: offset + pageSize < totalCount,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
