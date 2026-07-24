import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  plans: {
    starter: { oneTime: 0 },
    standard: { oneTime: 0 },
    pro: { monthly: 0, yearly: 0 },
    power: { monthly: 0, yearly: 0 },
  },
  offer: { active: false, label: '', percentOff: 0, appliesTo: 'all' as const, expiresAt: null as number | null },
};

/** GET — current pricing + offer (settings/pricing), falling back to defaults. */
export async function GET() {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const snap = await db.collection('settings').doc('pricing').get();
    if (!snap.exists) return NextResponse.json(DEFAULTS);
    const d = snap.data() ?? {};
    return NextResponse.json({
      plans: {
        starter: { oneTime: d.plans?.starter?.oneTime ?? DEFAULTS.plans.starter.oneTime },
        standard: { oneTime: d.plans?.standard?.oneTime ?? DEFAULTS.plans.standard.oneTime },
        pro: { monthly: d.plans?.pro?.monthly ?? DEFAULTS.plans.pro.monthly, yearly: d.plans?.pro?.yearly ?? DEFAULTS.plans.pro.yearly },
        power: { monthly: d.plans?.power?.monthly ?? DEFAULTS.plans.power.monthly, yearly: d.plans?.power?.yearly ?? DEFAULTS.plans.power.yearly },
      },
      offer: {
        active: !!d.offer?.active,
        label: d.offer?.label ?? '',
        percentOff: d.offer?.percentOff ?? 0,
        appliesTo: ['all', 'starter', 'standard', 'pro', 'power'].includes(d.offer?.appliesTo) ? d.offer.appliesTo : 'all',
        expiresAt: d.offer?.expiresAt ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read pricing';
    console.error('[pricing GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST { plans, offer } — update pricing + offer. */
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

    const plans = {
      starter: {
        oneTime: num(body?.plans?.starter?.oneTime, DEFAULTS.plans.starter.oneTime),
      },
      standard: {
        oneTime: num(body?.plans?.standard?.oneTime, DEFAULTS.plans.standard.oneTime),
      },
      pro: {
        monthly: num(body?.plans?.pro?.monthly, DEFAULTS.plans.pro.monthly),
        yearly: num(body?.plans?.pro?.yearly, DEFAULTS.plans.pro.yearly),
      },
      power: {
        monthly: num(body?.plans?.power?.monthly, DEFAULTS.plans.power.monthly),
        yearly: num(body?.plans?.power?.yearly, DEFAULTS.plans.power.yearly),
      },
    };

    const appliesTo = ['all', 'starter', 'standard', 'pro', 'power'].includes(body?.offer?.appliesTo) ? body.offer.appliesTo : 'all';
    const offer = {
      active: !!body?.offer?.active,
      label: String(body?.offer?.label ?? '').slice(0, 80),
      percentOff: Math.max(0, Math.min(90, num(body?.offer?.percentOff, 0))),
      appliesTo,
      expiresAt: body?.offer?.expiresAt ? Number(body.offer.expiresAt) : null,
    };

    await db.collection('settings').doc('pricing').set(
      { plans, offer, updatedAt: Date.now(), updatedBy: session?.email || 'system' },
      { merge: true },
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
