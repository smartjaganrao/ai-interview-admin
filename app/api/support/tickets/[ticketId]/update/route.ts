import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const session = await getSession();

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
    const updateData: Record<string, unknown> = { updatedAt: Date.now() };
    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (priority) updateData.priority = priority;

    await db
      .collection('support_tickets')
      .doc(ticketId)
      .update(updateData);

    // Log action
    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
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
  } catch (error) {
    console.error('Error updating ticket:', error);
    const message = error instanceof Error ? error.message : 'Failed to update ticket';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
