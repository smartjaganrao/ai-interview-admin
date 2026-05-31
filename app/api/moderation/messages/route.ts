import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
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
    const statusFilter = searchParams.get('status') || 'pending';

    const pageSize = Math.min(limit, 100);
    const offset = (page - 1) * pageSize;

    // Build query for flagged messages
    let queryRef: any = db.collectionGroup('interview_messages');

    if (statusFilter && statusFilter !== 'all') {
      queryRef = queryRef.where('flagged', '==', true);
      if (statusFilter !== 'flagged') {
        queryRef = queryRef.where('flagStatus', '==', statusFilter);
      }
    }

    // Get count
    const countSnapshot = await queryRef.count().get();
    const totalCount = countSnapshot.data().count;

    // Fetch messages
    const snapshot = await queryRef
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(pageSize)
      .get();

    const messages = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      sessionId: doc.data().sessionId || '',
      userId: doc.data().userId || '',
      question: doc.data().question || '',
      answer: doc.data().answer?.substring(0, 200) || '',
      flagged: doc.data().flagged || false,
      flagReason: doc.data().flagReason || 'spam',
      flagStatus: doc.data().flagStatus || 'pending',
      createdAt: doc.data().createdAt || 0,
    }));

    return NextResponse.json({
      messages,
      total: totalCount,
      page,
      limit: pageSize,
      hasMore: offset + pageSize < totalCount,
    });
  } catch (error: any) {
    console.error('Error fetching moderation queue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch moderation queue' },
      { status: 500 }
    );
  }
}
