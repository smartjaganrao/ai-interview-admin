import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

interface Item {
  id: string;
  type: 'ticket' | 'signup' | 'payment' | 'refund' | 'creator';
  title: string;
  subtitle: string;
  timestamp: number;
  href: string;
}

/**
 * GET — merges recent events from several collections into one feed:
 *   - newly opened support tickets
 *   - new user signups
 *   - activated subscriptions / refunds (from admin_logs, written by the
 *     payment + refund routes)
 *   - new creator program signups
 * Unread is computed against a per-admin "last seen" timestamp so each
 * admin gets their own badge count without a dedicated write on every event.
 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();

  const items: Item[] = [];

  // No compound where+orderBy — each needs a composite index we haven't
  // created. Fetch unsorted (capped) and sort client-side instead.
  const [tickets, users, logs, creators, creatorsForPending] = await Promise.all([
    db.collection('support_tickets').where('status', '==', 'open').limit(50).get(),
    db.collection('users').orderBy('createdAt', 'desc').limit(15).get(),
    db.collection('admin_logs').orderBy('timestamp', 'desc').limit(100).get(),
    db.collection('creators').orderBy('createdAt', 'desc').limit(15).get(),
    db.collection('creators').limit(500).get(),
  ]);

  const ticketDocs = tickets.docs
    .sort((a, b) => (b.data().createdAt || 0) - (a.data().createdAt || 0))
    .slice(0, 15);
  const payments = logs.docs.filter(d => d.data().action === 'subscription_activate').slice(0, 15);
  const refunds = logs.docs.filter(d => d.data().action === 'user_refund').slice(0, 15);

  for (const doc of ticketDocs) {
    const d = doc.data();
    items.push({ id: `ticket_${doc.id}`, type: 'ticket', title: d.title || 'New support ticket', subtitle: d.userEmail || '', timestamp: d.createdAt || 0, href: '/support' });
  }
  for (const doc of users.docs) {
    const d = doc.data();
    items.push({ id: `signup_${doc.id}`, type: 'signup', title: 'New signup', subtitle: d.email || d.name || '', timestamp: d.createdAt || 0, href: '/users' });
  }
  for (const doc of payments) {
    const d = doc.data();
    const det = d.details || {};
    items.push({ id: `payment_${doc.id}`, type: 'payment', title: `New ${det.plan || ''} subscription`.trim(), subtitle: det.amount ? `₹${det.amount}` : '', timestamp: d.timestamp || 0, href: '/users' });
  }
  for (const doc of refunds) {
    const d = doc.data();
    items.push({ id: `refund_${doc.id}`, type: 'refund', title: 'Refund recorded', subtitle: d.targetUserEmail || d.adminEmail || '', timestamp: d.timestamp || 0, href: '/users' });
  }
  for (const doc of creators.docs) {
    const d = doc.data();
    items.push({ id: `creator_${doc.id}`, type: 'creator', title: 'New creator signup', subtitle: d.email || d.name || '', timestamp: d.createdAt || 0, href: '/creators' });
  }

  items.sort((a, b) => b.timestamp - a.timestamp);
  const feed = items.slice(0, 30);

  let pendingPayoutTotal = 0;
  let pendingPayoutCount = 0;
  for (const doc of creatorsForPending.docs) {
    const d = doc.data();
    const pending = Math.max(0, (d.totalEarned ?? 0) - (d.totalPaid ?? 0));
    if (pending > 0) { pendingPayoutTotal += pending; pendingPayoutCount++; }
  }

  let lastSeenAt = 0;
  if (session?.uid) {
    const stateDoc = await db.collection('admin_notification_state').doc(session.uid).get();
    lastSeenAt = stateDoc.data()?.lastSeenAt || 0;
  }

  const unreadCount = feed.filter(i => i.timestamp > lastSeenAt).length;

  return NextResponse.json({ items: feed, unreadCount, lastSeenAt, pendingPayoutTotal, pendingPayoutCount });
}
