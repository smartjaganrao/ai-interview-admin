import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';
import { clearCache } from '@/lib/route-cache';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ answerId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { answerId } = await params;

    if (!answerId) {
      return NextResponse.json({ error: 'Missing answerId' }, { status: 400 });
    }

    const docRef = db.collection('interview_messages').doc(answerId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
    }

    const data = docSnap.data() || {};

    await docRef.delete();

    clearCache();

    await db.collection('admin_logs').add({
      adminUid: session.uid,
      adminEmail: session.email,
      action: 'ai_answer_delete',
      targetUserId: data.userId || '',
      targetUserEmail: '',
      details: {
        answerId,
        sessionId: data.sessionId || '',
        questionSnippet: (data.question || '').substring(0, 200),
        answerSnippet: (data.answer || '').substring(0, 200),
      },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'AI answer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting AI answer:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete AI answer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
