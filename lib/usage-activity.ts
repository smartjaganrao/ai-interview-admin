import { db } from '@/lib/firebase-admin';
import { getCached } from '@/lib/route-cache';

export interface UserActivity {
  lastActive: number;   // ms epoch of most recent usage_tracking day, 0 if never
  activeDays: number;   // number of distinct days with usage
  tokensUsed: number;
  voiceMinutes: number;
  screenshotsUsed: number;
  mockSessions: number;
}

export type ActivityMap = Map<string, UserActivity>;

/**
 * Builds a per-user desktop-app activity map from the `usage_tracking/{uid}/days/*`
 * subcollections. A user appears in the map only if they have at least one usage
 * day — i.e. they have actually used the desktop app. Absence = never activated.
 *
 * Uses a single collectionGroup('days') read and aggregates in memory, so it
 * scales with the number of usage-days, not the number of users. Each day doc's
 * owning uid is recovered from its parent path (days -> {uid} -> usage_tracking).
 */
export async function getActivityMap(): Promise<ActivityMap> {
  const map: ActivityMap = new Map();
  if (!db) return map;

  const snap = await db.collectionGroup('days').get();
  for (const doc of snap.docs) {
    const segments = doc.ref.path.split('/');
    if (segments.length !== 4 || segments[2] !== 'days') continue;
    const uid = segments[1];
    const d = doc.data();
    const lastUpdated = (d.lastUpdated as number) || 0;

    const cur = map.get(uid) ?? {
      lastActive: 0, activeDays: 0,
      tokensUsed: 0, voiceMinutes: 0, screenshotsUsed: 0, mockSessions: 0,
    };
    cur.activeDays += 1;
    cur.lastActive = Math.max(cur.lastActive, lastUpdated);
    cur.tokensUsed += (d.tokensUsed as number) || 0;
    cur.voiceMinutes += (d.voiceMinutes as number) || 0;
    cur.screenshotsUsed += (d.screenshotsUsed as number) || 0;
    cur.mockSessions += (d.mockSessions as number) || 0;
    map.set(uid, cur);
  }
  return map;
}

/**
 * Shared-cache wrapper around getActivityMap(). The underlying
 * collectionGroup('days') scan reads every usage-day document ever written —
 * it doesn't depend on pagination, search, or plan filters — but both
 * callers (users/list and analytics/adoption) used to call getActivityMap()
 * directly from inside their OWN per-route caches. users/list's cache key
 * varies per page/limit/search/plan, so every distinct combination an admin
 * browsed re-ran the full historical scan from scratch, and adoption ran a
 * second independent copy on its own schedule. Caching this call on its own
 * fixed key means the expensive scan runs at most once per TTL window,
 * shared by both routes, regardless of how many list/filter combinations
 * get requested in between.
 */
export function getCachedActivityMap(): Promise<ActivityMap> {
  return getCached('usage:activity-map', 15 * 60 * 1000, getActivityMap);
}

const DAY = 24 * 60 * 60 * 1000;

export type Segment = 'active7' | 'active30' | 'dormant' | 'never';

/** Classifies a user into an engagement segment given their last-active timestamp. */
export function segmentFor(lastActive: number, now = Date.now()): Segment {
  if (!lastActive) return 'never';
  const age = now - lastActive;
  if (age <= 7 * DAY) return 'active7';
  if (age <= 30 * DAY) return 'active30';
  return 'dormant';
}
