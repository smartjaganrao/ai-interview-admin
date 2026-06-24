import { db } from '@/lib/firebase-admin';

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
    const uid = doc.ref.parent.parent?.id;
    if (!uid) continue;
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
