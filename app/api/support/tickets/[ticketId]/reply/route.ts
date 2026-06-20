import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session-server';
import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'JavihAI Support <onboarding@resend.dev>';

async function emailCustomer(to: string, ticketTitle: string, replyMessage: string, ticketId: string) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;background:#0f172a;color:#e2e8f0;padding:0;margin:0;">
<div style="max-width:600px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:14px 22px;">
      <span style="color:white;font-size:22px;font-weight:800;">JavihAI</span>
    </div>
  </div>
  <h1 style="font-size:22px;font-weight:800;margin-bottom:4px;">💬 Reply to your support ticket</h1>
  <p style="color:#94a3b8;font-size:14px;margin-bottom:20px;">We replied to: <strong style="color:#e2e8f0;">${ticketTitle}</strong></p>
  <div style="background:#1e293b;border-left:3px solid #6366f1;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:20px;">
    <p style="color:#a5b4fc;font-size:12px;font-weight:600;margin:0 0 8px;">JavihAI Support</p>
    <p style="color:#cbd5e1;font-size:14px;line-height:1.7;margin:0;">${replyMessage.replace(/\n/g, '<br>')}</p>
  </div>
  <div style="text-align:center;">
    <a href="https://javihai.in/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">View in Dashboard →</a>
  </div>
  <p style="color:#475569;font-size:12px;text-align:center;margin-top:32px;">JavihAI · <a href="https://javihai.in" style="color:#6366f1;">javihai.in</a></p>
</div></body></html>`;
  await resend.emails.send({ from: FROM, to, subject: `Re: ${ticketTitle} — JavihAI Support`, html }).catch(() => {});
}

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

    const ticketData = ticketDoc.data()!;
    await db.collection('support_tickets').doc(ticketId).update({ messages, updatedAt: Date.now() });

    // Email the customer — non-blocking
    if (ticketData.userEmail) {
      emailCustomer(ticketData.userEmail, ticketData.title || 'Your ticket', message, ticketId);
    }

    return NextResponse.json({ success: true, message: 'Reply added successfully' });
  } catch (error: any) {
    console.error('Error adding reply:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add reply' },
      { status: 500 }
    );
  }
}
