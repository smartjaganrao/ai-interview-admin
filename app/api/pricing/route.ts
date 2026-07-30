import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';
import { PLANS, PlanId } from '@/lib/pricing-config';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  plans: {} as Record<PlanId, any>,
  offer: { active: false, label: '', percentOff: 0, appliesTo: 'all' as const, expiresAt: null as number | null },
};

PLANS.forEach(p => {
  DEFAULTS.plans[p.id] = p.billingType === 'subscription'
    ? { oneTime: 0, monthly: p.price, yearly: p.price * 10, active: p.isActive, displayOrder: p.displayOrder, badge: p.badge || '', highlighted: p.isHighlighted }
    : { oneTime: p.price, monthly: 0, yearly: 0, active: p.isActive, displayOrder: p.displayOrder, badge: p.badge || '', highlighted: p.isHighlighted };
});

/** GET — current pricing + offer (settings/pricing), falling back to defaults. */
export async function GET() {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const snap = await db.collection('settings').doc('pricing').get();
    if (!snap.exists) return NextResponse.json(JSON.parse(JSON.stringify(DEFAULTS)));
    const d = snap.data() ?? {};
    const plans: Record<PlanId, any> = { free: {}, quick_pass: {}, pro: {}, power: {} };
    PLANS.forEach(p => {
      const stored = (d.plans as any)?.[p.id] || {};
      plans[p.id] = {
        oneTime: Number(stored.oneTime ?? p.price),
        monthly: Number(stored.monthly ?? (p.billingType === 'subscription' ? p.price : 0)),
        yearly: Number(stored.yearly ?? (p.billingType === 'subscription' ? p.price * 10 : 0)),
        active: stored.active ?? p.isActive,
        displayOrder: stored.displayOrder ?? p.displayOrder,
        badge: stored.badge ?? p.badge ?? '',
        highlighted: stored.highlighted ?? p.isHighlighted,
      };
    });
    return NextResponse.json({
      plans,
      offer: {
        active: !!d.offer?.active,
        label: d.offer?.label ?? '',
        percentOff: d.offer?.percentOff ?? 0,
        appliesTo: ['all', ...PLANS.map(p => p.id)].includes(d.offer?.appliesTo) ? d.offer.appliesTo : 'all',
        expiresAt: d.offer?.expiresAt ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read pricing';
    console.error('[pricing GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST { plans, offer } — update pricing + plans. */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await getSession();
    const body = await request.json();

    const num = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
    };

    const plans: Record<PlanId, any> = {} as any;
    PLANS.forEach(p => {
      const stored = (body?.plans?.[p.id] || {});
      plans[p.id] = {
        oneTime: num(stored.oneTime, p.price),
        monthly: num(stored.monthly, p.billingType === 'subscription' ? p.price : 0),
        yearly: num(stored.yearly, p.billingType === 'subscription' ? p.price * 10 : 0),
        active: stored.active ?? p.isActive,
        displayOrder: num(stored.displayOrder, p.displayOrder),
        badge: String(stored.badge ?? p.badge ?? '').slice(0, 50),
        highlighted: !!stored.highlighted,
      };
    });

    const appliesTo = ['all', ...PLANS.map(p => p.id)].includes(body?.offer?.appliesTo) ? body.offer.appliesTo : 'all';
    const offer = {
      active: !!body?.offer?.active,
      label: String(body?.offer?.label ?? '').slice(0, 80),
      percentOff: Math.max(0, Math.min(90, num(body?.offer?.percentOff, 0))),
      appliesTo,
      expiresAt: body?.offer?.expiresAt ? Number(body.offer.expiresAt) : null,
    };

    await db.collection('settings').doc('pricing').set(
      { plans, offer, updatedAt: Date.now(), updatedBy: session?.email || 'system' },
      { merge: true }
    );

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'pricing_update',
      details: { plans, offer },
      timestamp: Date.now(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, message: 'Pricing updated', plans, offer });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update pricing';
    console.error('[pricing POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
