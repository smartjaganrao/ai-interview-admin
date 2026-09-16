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
    return getCached(cacheKey, 5 * 60 * 1000, async () => {
      const pageSize = Math.min(Math.max(1, limit), 200);

      let queryRef: FirebaseFirestore.Query = firestore.collection('support_tickets');
      if (statusFilter && statusFilter !== 'all') {
        queryRef = queryRef.where('status', '==', statusFilter);
      }

      try {
        const countSnap = await queryRef.count().get();
        const totalCount = countSnap.data().count;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const safePage = Math.min(Math.max(1, page), totalPages);
        const offset = (safePage - 1) * pageSize;

        const snapshot = await queryRef
          .orderBy('updatedAt', 'desc')
          .offset(offset)
          .limit(pageSize)
          .get();

        const tickets = snapshot.docs.map((doc) => ({
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

        return {
          tickets,
          total: totalCount,
          page: safePage,
          limit: pageSize,
          totalPages,
          hasMore: offset + pageSize < totalCount,
        };
      } catch {
        const snapshot = await firestore.collection('support_tickets').get();
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

        tickets.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        if (statusFilter && statusFilter !== 'all') {
          tickets = tickets.filter((t) => t.status === statusFilter);
        }

        const totalCount = tickets.length;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const safePage = Math.min(Math.max(1, page), totalPages);
        const offset = (safePage - 1) * pageSize;
        const paged = tickets.slice(offset, offset + pageSize);

        return {
          tickets: paged,
          total: totalCount,
          page: safePage,
          limit: pageSize,
          totalPages,
          hasMore: offset + pageSize < totalCount,
        };
      }
    }).then((data) => NextResponse.json(data));
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch support tickets';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
