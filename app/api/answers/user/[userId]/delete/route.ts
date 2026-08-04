import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const queryRef = db.collection('interview_messages').where('userId', '==', userId);
    const snapshot = await queryRef.get();

    const batch = db.batch();
    const docs = snapshot.docs;
    const count = docs.length;

    docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    await db.collection('admin_logs').add({
      adminUid: session.uid,
      adminEmail: session.email,
      action: 'ai_answer_delete_bulk',
      targetUserId: userId,
      targetUserEmail: '',
      details: {
        deletedCount: count,
        reason: 'admin_bulk_delete',
      },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${count} AI answer${count === 1 ? '' : 's'}`,
      deletedCount: count,
    });
  } catch (error) {
    console.error('Error deleting AI answers for user:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete AI answers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
