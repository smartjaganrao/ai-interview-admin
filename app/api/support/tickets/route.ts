import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';
import { getCached } from '@/lib/route-cache';

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const statusFilter = searchParams.get('status') || 'open';

    const cacheKey = `support:tickets:${page}:${limit}:${statusFilter}`;

    const firestore = db;
    return getCached(cacheKey, 30 * 1000, async () => {
      const pageSize = Math.min(limit, 100);
      const offset = (page - 1) * pageSize;

      const snapshot = await firestore
        .collection('support_tickets')
      .orderBy('updatedAt', 'desc')
      .limit(500)
      .get();

    let tickets = snapshot.docs.map((doc) => ({
      id: doc.id,
      userId: doc.data().userId || '',
      userEmail: doc.data().userEmail || '',
      title: doc.data().title || '',
      status: doc.data().status || 'open',
      priority: doc.data().priority || 'medium',
      category: doc.data().category || 'other',
      assignedTo: doc.data().assignedTo || null,
      createdAt: doc.data().createdAt || 0,
      updatedAt: doc.data().updatedAt || 0,
      messages: doc.data().messages || [],
      messageCount: (doc.data().messages || []).length,
    }));

    if (statusFilter && statusFilter !== 'all') {
      tickets = tickets.filter((t) => t.status === statusFilter);
    }

    const totalCount = tickets.length;
    const paged = tickets.slice(offset, offset + pageSize);

    return NextResponse.json({
      tickets: paged,
      total: totalCount,
      page,
      limit: pageSize,
      hasMore: offset + pageSize < totalCount,
    });
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch support tickets';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
