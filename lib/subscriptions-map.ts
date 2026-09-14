import { db } from '@/lib/firebase-admin';
import { getCached } from '@/lib/route-cache';

export interface SubscriptionInfo {
  // Unified "when does the current plan period end" timestamp — renewalDate
  // for recurring (monthly/yearly) plans, expiresAt for one-time plans. null
  // for free users (no subscriptions/{uid} doc ever written for them) or a
  // plan type that genuinely never expires.
  planExpiresAt: number | null;
  planType: string | null; // 'subscription' | 'one-time', as written by persistSubscription()
}

export type SubscriptionsMap = Map<string, SubscriptionInfo>;

/**
 * subscriptions/{uid} is doc-ID-keyed by uid (see persistSubscription() in
 * ai-interview-landing/lib/firebase-admin.ts), so this is a single flat
 * collection scan — no join needed, same shape as getActivityMap()'s
 * collectionGroup scan in usage-activity.ts.
 */
export async function getSubscriptionsMap(): Promise<SubscriptionsMap> {
  const map: SubscriptionsMap = new Map();
  if (!db) return map;

  const snap = await db.collection('subscriptions').get();
  for (const doc of snap.docs) {
    const d = doc.data();
    const planType = (d.planType as string) || null;
    const planExpiresAt = planType === 'one-time'
      ? ((d.expiresAt as number) ?? null)
      : ((d.renewalDate as number) ?? null);
    map.set(doc.id, { planExpiresAt, planType });
  }
  return map;
}

/** Shared-cache wrapper — same TTL/rationale as getCachedActivityMap(). */
export function getCachedSubscriptionsMap(): Promise<SubscriptionsMap> {
  return getCached('subscriptions:map', 15 * 60 * 1000, getSubscriptionsMap);
}
