import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
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

    const { messageId } = await params;
    const { reason } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing messageId' },
        { status: 400 }
      );
    }

    // Find the message in interview_messages collection
    const messagesSnapshot = await db
      .collectionGroup('interview_messages')
      .where('__name__', '==', messageId)
      .limit(1)
      .get();

    if (messagesSnapshot.empty) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const messageDoc = messagesSnapshot.docs[0];
    const messageData = messageDoc.data();

    // Delete the message
    await messageDoc.ref.delete();

    // Create moderation log entry
    await db.collection('admin_logs').add({
      adminUid: session.uid,
      adminEmail: session.email,
      action: 'content_delete',
      targetUserId: messageData.userId,
      targetUserEmail: messageData.userEmail || '',
      details: {
        reason: reason || 'spam',
        questionSnippet: messageData.question?.substring(0, 100) || '',
        answerSnippet: messageData.answer?.substring(0, 100) || '',
      },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete message';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
