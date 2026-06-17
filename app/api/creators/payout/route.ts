import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/**
 * POST { creatorId, reference } — record a manual payout.
 * Sums the creator's `accrued` commissions, marks them `paid`, bumps the
 * creator's totalPaid, writes a creator_payouts record, and logs it. The actual
 * money transfer (UPI) is done manually by the admin; this just reconciles.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const session = await getSession();
    const { creatorId, reference } = await request.json();
    if (!creatorId || !reference) {
      return NextResponse.json({ error: 'creatorId and reference (UPI txn ref) are required' }, { status: 400 });
    }

    const creatorRef = db.collection('creators').doc(creatorId);
    const creatorSnap = await creatorRef.get();
    if (!creatorSnap.exists) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }
    const creator = creatorSnap.data()!;

    const accrued = await db.collection('creator_commissions')
      .where('creatorId', '==', creatorId).where('status', '==', 'accrued').get();
    if (accrued.empty) {
      return NextResponse.json({ error: 'No accrued commissions to pay out' }, { status: 400 });
    }

    let amount = 0;
    accrued.forEach((d) => { amount += d.data().commissionAmount ?? 0; });

    // Mark commissions paid in batches (≤400 to stay under the 500-write limit).
    const now = Date.now();
    for (let i = 0; i < accrued.docs.length; i += 400) {
      const batch = db.batch();
      for (const d of accrued.docs.slice(i, i + 400)) {
        batch.update(d.ref, { status: 'paid', paidAt: now, payoutRef: String(reference) });
      }
      await batch.commit();
    }

    const payoutRef = await db.collection('creator_payouts').add({
      creatorId, code: creator.code, amount, upi: creator.payoutUpi ?? null,
      reference: String(reference), commissionCount: accrued.size, paidAt: now,
      paidByAdmin: session?.email || 'system',
    });

    await creatorRef.set({ totalPaid: (creator.totalPaid ?? 0) + amount, updatedAt: now }, { merge: true });

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'creator_payout',
      targetUserId: creatorId,
      details: { code: creator.code, amount, commissionCount: accrued.size, reference: String(reference), payoutId: payoutRef.id },
      timestamp: now,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, message: `Paid ₹${amount} to ${creator.code} (${accrued.size} commissions)`, amount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record payout';
    console.error('[creators/payout]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
