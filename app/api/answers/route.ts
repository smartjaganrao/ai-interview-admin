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
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const userIdFilter = searchParams.get('userId') || '';
    const sessionIdFilter = searchParams.get('sessionId') || '';

    const cacheKey = `answers:${page}:${limit}:${userIdFilter}:${sessionIdFilter}`;

    return getCached(cacheKey, 30 * 1000, async () => {
      const firestore = db!;
      const pageSize = Math.min(limit, 100);
      const offset = (page - 1) * pageSize;

      let queryRef = firestore.collection('interview_messages');

      if (userIdFilter) {
        queryRef = queryRef.where('userId', '==', userIdFilter) as ReturnType<typeof firestore.collection>;
      }
      if (sessionIdFilter) {
        queryRef = queryRef.where('sessionId', '==', sessionIdFilter) as ReturnType<typeof firestore.collection>;
      }

      const countSnapshot = await queryRef.count().get();
      const totalCount = countSnapshot.data().count;

      const snapshot = await queryRef
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(pageSize)
        .get();

    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        sessionId: data.sessionId || '',
        userId: data.userId || '',
        question: data.question || '',
        answer: (data.answer || '').substring(0, 500),
        confidence: data.confidence || null,
        difficulty: data.difficulty || null,
        createdAt: data.createdAt || 0,
      };
    });

    return NextResponse.json({
      messages,
      total: totalCount,
      page,
      limit: pageSize,
      hasMore: offset + pageSize < totalCount,
    });
    });
  } catch (error) {
    console.error('Error fetching AI answers:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch AI answers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
