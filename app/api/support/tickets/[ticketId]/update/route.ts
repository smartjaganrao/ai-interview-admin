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
    const { status, assignedTo, priority } = await request.json();

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Missing ticketId' },
        { status: 400 }
      );
    }

    // Update ticket
    const updateData: any = { updatedAt: Date.now() };
    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (priority) updateData.priority = priority;

    await db
      .collection('support_tickets')
      .doc(ticketId)
      .update(updateData);

    // Log action
    await db.collection('admin_logs').add({
      adminUid: session.uid,
      adminEmail: session.email,
      action: 'ticket_update',
      targetId: ticketId,
      details: updateData,
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
