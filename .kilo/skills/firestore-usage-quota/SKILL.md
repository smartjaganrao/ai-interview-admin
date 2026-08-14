---
name: firestore-usage-quota
description: Use whenever a task touches AI usage quota, daily limits, or the usage_tracking Firestore collection across any of the three repos — avoids re-grepping to rediscover the correct path.
---

# Usage quota path

`usage_tracking/{uid}/days/{YYYY-MM-DD}` is the **only** real usage path, keyed by `dayKey()`.

- Canonical implementation: `ai-interview-landing/lib/firebase-admin.ts:71` (`dayKey()`) and `:123-124` (`checkAiQuota` reads `.collection('usage_tracking').doc(uid).collection('days').doc(dayKey())`).
- Same path is used by: the desktop app's `usage.service.ts`, admin's `ai-interview-admin/app/api/users/reset-quota/route.ts`, admin's `ai-interview-admin/app/api/settings/backup/*`, and the dashboard's "Today's Usage" widget.
- An old `months/{YYYY-MM}` subcollection appears in some legacy code and in `firestore.rules` but nothing ever wrote to it — it is dead. If you see `months` anywhere near `usage_tracking`, treat it as stale leftover, not a second valid path or a bug to "fix" by writing to it.

Don't grep the whole codebase to re-derive this — start from `firebase-admin.ts:71` and follow its callers.
