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
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { ticketId } = await params;
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 });
    }

    const ticketRef = db.collection('support_tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();
    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await ticketRef.delete();

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'ticket_delete',
      targetId: ticketId,
      details: { subject: ticketDoc.data()?.subject || '' },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, message: 'Ticket deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete ticket';
    console.error('Error deleting ticket:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
