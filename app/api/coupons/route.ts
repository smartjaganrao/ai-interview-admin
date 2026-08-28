import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';
import { getCached, invalidateCache } from '@/lib/route-cache';

export type DiscountType = 'percent' | 'flat';
export type PlanId = 'free' | 'quick_pass' | 'pro' | 'power';

export interface CouponRecord {
  code: string;
  label: string;
  discountType: DiscountType;
  discountValue: number;
  appliesTo: 'all' | PlanId;
  active: boolean;
  featured: boolean;
  expiresAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export const dynamic = 'force-dynamic';

// Landing is a separate deployment with its own independent in-memory
// coupons cache (getCoupons() in its firebase-admin.ts) — invalidateCache()
// below only clears this admin app's own cache. Same reasoning as
// app/api/pricing/route.ts's LANDING_URL invalidation call.
const LANDING_URL = 'https://javihai.in';

const CODE_RE = /^[A-Z0-9_-]{3,24}$/;

/** GET — all coupons (settings/coupons), or {} if unset. */
export async function GET() {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    return getCached('coupons:current', 2 * 60 * 1000, async () => {
      const snap = await db!.collection('settings').doc('coupons').get();
      return NextResponse.json({ coupons: snap.exists ? (snap.data()?.coupons ?? {}) : {} });
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read coupons';
    console.error('[coupons GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST { coupons: Record<code, CouponInput> } — overwrites the ENTIRE map.
 *
 * Deliberately a full `.set()`, no `{merge: true}`. Firestore's nested-map
 * merge does not remove keys missing from the write — pricing's `plans` map
 * always has exactly 4 fixed keys so merge is safe there, but coupon codes
 * are arbitrary and deletable. Using merge here would mean an admin
 * "deleting" a coupon in the UI silently leaves it redeemable in Firestore
 * forever. Always send the complete, already-filtered map.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await getSession();
    const body = await request.json();

    const existingSnap = await db.collection('settings').doc('coupons').get();
    const existing = (existingSnap.exists ? existingSnap.data()?.coupons : {}) as Record<string, Partial<CouponRecord>> ?? {};

    const now = Date.now();
    const coupons: Record<string, CouponRecord> = {};
    for (const [rawCode, raw] of Object.entries((body?.coupons ?? {}) as Record<string, Partial<CouponRecord>>)) {
      const code = String(rawCode).trim().toUpperCase();
      if (!CODE_RE.test(code)) continue; // reject malformed/empty codes

      const discountType: DiscountType = raw.discountType === 'flat' ? 'flat' : 'percent';
      const discountValue = discountType === 'percent'
        ? Math.max(1, Math.min(90, Math.round(Number(raw.discountValue) || 0)))
        : Math.max(1, Math.round(Number(raw.discountValue) || 0));
      const appliesTo = (['all', 'free', 'quick_pass', 'pro', 'power'] as string[]).includes(raw.appliesTo as string)
        ? (raw.appliesTo as CouponRecord['appliesTo'])
        : 'all';

      coupons[code] = {
        code,
        label: String(raw.label ?? code).slice(0, 80),
        discountType,
        discountValue,
        appliesTo,
        active: !!raw.active,
        featured: !!raw.featured,
        expiresAt: raw.expiresAt ? Number(raw.expiresAt) : null,
        createdAt: existing[code]?.createdAt ?? now,
        updatedAt: now,
      };
    }

    await db.collection('settings').doc('coupons').set({
      coupons,
      updatedAt: now,
      updatedBy: session?.email || 'system',
    });

    invalidateCache('coupons:current');

    if (process.env.PRICING_INVALIDATE_SECRET) {
      fetch(`${LANDING_URL}/api/coupons/invalidate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.PRICING_INVALIDATE_SECRET}` },
      }).catch((err) => console.error('[coupons POST] landing cache invalidation failed:', err));
    }

    await db.collection('admin_logs').add({
      adminUid: session?.uid || 'system',
      adminEmail: session?.email || 'system',
      action: 'coupons_update',
      details: { couponCodes: Object.keys(coupons) },
      timestamp: now,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, coupons });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update coupons';
    console.error('[coupons POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
