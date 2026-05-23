import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
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

    const { ticketId } = await params;
    const { message } = await request.json();

    if (!ticketId || !message) {
      return NextResponse.json(
        { error: 'Missing ticketId or message' },
        { status: 400 }
      );
    }

    // Get ticket
    const ticketDoc = await db
      .collection('support_tickets')
      .doc(ticketId)
      .get();

    if (!ticketDoc.exists) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Add message to ticket
    const messages = ticketDoc.data()?.messages || [];
    messages.push({
      senderType: 'admin',
      senderUid: session.uid,
      senderEmail: session.email,
      message,
      timestamp: Date.now(),
    });

    await db
      .collection('support_tickets')
      .doc(ticketId)
      .update({
        messages,
        updatedAt: Date.now(),
      });

    return NextResponse.json({
      success: true,
      message: 'Reply added successfully',
    });
  } catch (error: any) {
    console.error('Error adding reply:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add reply' },
      { status: 500 }
    );
  }
}
