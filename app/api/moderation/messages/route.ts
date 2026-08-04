import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';
import { getCached } from '@/lib/route-cache';

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const statusFilter = searchParams.get('status') || 'pending';

    const cacheKey = `moderation:messages:${page}:${limit}:${statusFilter}`;

    const firestore = db;
    return getCached(cacheKey, 30 * 1000, async () => {

    const pageSize = Math.min(limit, 100);
    const offset = (page - 1) * pageSize;

    // Build query for flagged messages
    let queryRef = firestore.collectionGroup('interview_messages');

    if (statusFilter && statusFilter !== 'all') {
      queryRef = queryRef.where('flagged', '==', true) as ReturnType<typeof firestore.collectionGroup>;
      if (statusFilter !== 'flagged') {
        queryRef = queryRef.where('flagStatus', '==', statusFilter) as ReturnType<typeof firestore.collectionGroup>;
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

    const messages = snapshot.docs.map((doc) => ({
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
    });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch moderation queue';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
