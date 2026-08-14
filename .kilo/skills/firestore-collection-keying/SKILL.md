---
name: firestore-collection-keying
description: Use before writing any Firestore query, delete, or backup routine against a new collection in any of the three repos — some collections are keyed by doc ID = userId, not a userId field, and a .where() query against them silently returns nothing.
---

# Check doc-ID keying before querying

Some Firestore collections use the doc ID itself as the userId (e.g. `subscriptions/{userId}`, `creator_attributions/{userId}`), rather than storing a `userId` field. A `.where('userId', '==', uid)` query against these returns nothing — no error, just silently empty results.

**Rule:** before writing a query, delete, or backup routine against any collection you haven't touched before, grep how it's *written* (not how you assume it should be read) to determine whether it's doc-ID-keyed or field-queryable.

```
grep -rn "collection('<name>').doc(" ai-interview-landing ai-interview-admin ai-interview-helper
```

If writes use `.doc(uid)` / `.doc(userId)`, read it the same way — `.doc(uid).get()`, not `.where('userId', '==', uid)`.

This exact mistake previously left orphaned `subscriptions` docs inflating MRR after user deletion in `ai-interview-admin/app/api/users/delete/route.ts` until fixed — check that route's current pattern as a reference for the correct approach.
