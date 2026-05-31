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
    const limit = parseInt(searchParams.get('limit') || '20');
    const statusFilter = searchParams.get('status') || 'open';

    const pageSize = Math.min(limit, 100);
    const offset = (page - 1) * pageSize;

    // Order by a single field only (auto-indexed) and filter status in memory —
    // avoids needing a composite index (status + updatedAt).
    const snapshot = await db
      .collection('support_tickets')
      .orderBy('updatedAt', 'desc')
      .limit(500)
      .get();

    let tickets = snapshot.docs.map((doc: any) => ({
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
      messageCount: (doc.data().messages || []).length,
    }));

    if (statusFilter && statusFilter !== 'all') {
      tickets = tickets.filter((t: any) => t.status === statusFilter);
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
  } catch (error: any) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}
