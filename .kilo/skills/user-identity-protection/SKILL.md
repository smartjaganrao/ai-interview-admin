---
name: user-identity-protection
description: >
  Use when working with user signup, login, user profile creation, user profile
  updates, checkout flow, subscription persistence, or admin user list in the
  AI Tutor apps. Triggers: modifying `ensureUserDocs`, `signInWithGoogle`,
  checkout page, `persistSubscription`, admin user list API, or any code that
  reads/writes `users/{uid}` documents. Enforces the rule that every user
  document MUST have `email` and `name` populated, and prevents duplicate
  emails across multiple UIDs.
---

# User Identity Protection

## The Golden Rule

Every `users/{uid}` document in Firestore MUST have both `email` and `name`
fields populated. There are no exceptions. Partial user documents (missing
`email` or `name`) break the admin panel user list and cause UIDs to be
displayed instead of human-readable identity.

---

## User Document Schema (MANDATORY)

```ts
{
  uid: string;        // Must match Firebase Auth UID
  email: string;      // REQUIRED — never empty, never missing
  name: string;       // REQUIRED — never empty, never missing
  plan: PlanId;       // 'free' | 'quick_pass' | 'pro' | 'power'
  createdAt: number;  // ms epoch
  settings: {
    theme: 'light' | 'dark';
    language: string;
  };
  // Optional: phone, experienceLevel, city, referralSource, etc.
}
```

---

## Code Review Checklist

Whenever you touch user profile creation or update code, verify ALL of these:

- [ ] `email` is written from `cred.user.email` (Firebase Auth), never left empty
- [ ] `name` is written from `cred.user.displayName`, never left empty
- [ ] If writing to an existing doc, missing `email`/`name` are backfilled from Auth
- [ ] Checkout/client-side writes include `email` and `name`, not just `plan`
- [ ] Server-side `persistSubscription` backfills `email`/`name` from `admin.auth().getUser()`
- [ ] No code path can create a user doc with only `{plan, updatedAt}`
- [ ] Duplicate email check exists before creating a new user doc
- [ ] Admin user list API backfills missing email/name before returning data

---

## Mandatory Patterns

### 0. Recovery guard in auth listeners

Every `onAuthStateChanged` handler must ensure the Firestore user doc exists.
This is the safety net for any sign-in path that might fail to write the profile.

```ts
// Desktop: src/services/firebase/auth.service.ts
export async function ensureUserDocExists(uid: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const userDocRef = doc(db, 'users', uid);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userDocRef);
      if (!snap.exists()) {
        tx.set(userDocRef, {
          uid,
          plan: 'free',
          createdAt: Date.now(),
          settings: { theme: 'dark', language: 'en' },
        });
      }
    });
  } catch (err) {
    console.warn('[ensureUserDocExists] failed:', err);
  }
}
```

```ts
// Desktop: src/features/auth/useAuth.ts
if (firebaseUser) {
  void ensureUserDocExists(firebaseUser.uid);
  void recordHeartbeat(firebaseUser.uid);
  ...
}
```

```ts
// Landing: hooks/useAuth.ts
const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
  if (currentUser) {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        await runTransaction(db, async (tx) => {
          const recheck = await tx.get(userDocRef);
          if (!recheck.exists()) {
            tx.set(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email || '',
              name: currentUser.displayName || 'there',
              plan: 'free',
              createdAt: Date.now(),
              settings: { theme: 'dark', language: 'en' },
            });
          }
        });
      }
    } catch (err) {
      console.warn('[useAuth] ensureUserDocExists failed:', err);
    }
  }
  setUser(currentUser);
  setLoading(false);
});
```

### 1. `ensureUserDocs` (landing app)

```ts
// ❌ BAD — silently swallows errors, no retry
try {
  await runTransaction(db, ...);
} catch (e) {
  console.warn('error:', e);
}

// ✅ GOOD — retry + throw on final failure
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    await runTransaction(db, ...);
    return;
  } catch (e) {
    if (attempt < 3) { await sleep(attempt * 500); continue; }
    console.error('[ensureUserDocs] failed after 3 attempts:', e);
    throw e;
  }
}
```

### 2. Checkout page client write

```ts
// ❌ BAD — creates partial document
await setDoc(doc(db, 'users', user.uid), { plan, updatedAt: Date.now() }, { merge: true });

// ✅ GOOD — includes identity fields
await setDoc(doc(db, 'users', user.uid), {
  plan, updatedAt: Date.now(),
  email: user.email || '',
  name: user.displayName || '',
}, { merge: true });
```

### 3. Server-side `persistSubscription`

```ts
// ❌ BAD — never backfills identity
batch.set(db.collection('users').doc(params.userId), { plan: params.plan, updatedAt: Date.now() }, { merge: true });

// ✅ GOOD — backfills from Firebase Auth if missing
const userRef = db.collection('users').doc(params.userId);
const userSnap = await userRef.get();
const update: Record<string, unknown> = { plan: params.plan, updatedAt: Date.now() };
if (!userSnap.exists || !userSnap.data()?.email) {
  const fbUser = await admin.auth().getUser(params.userId);
  if (fbUser.email) update.email = fbUser.email;
  if (fbUser.displayName) update.name = fbUser.displayName;
}
batch.set(userRef, update, { merge: true });
```

### 4. Desktop `signInWithGoogle` backfill

```ts
// ❌ BAD — only migrates plan, ignores missing email/name
if (existing?.plan && migratePlanId(existing.plan) !== existing.plan) {
  tx.update(userDocRef, { plan: migratePlanId(existing.plan) });
}

// ✅ GOOD — backfills missing identity fields
const updates: Record<string, unknown> = {};
if (!existing.email && user.email) updates.email = user.email;
if (!existing.name && user.displayName) updates.name = user.displayName;
if (existing?.plan && migratePlanId(existing.plan) !== existing.plan) {
  updates.plan = migratePlanId(existing.plan);
}
if (Object.keys(updates).length > 0) {
  tx.update(userDocRef, { ...updates, updatedAt: Date.now() });
}
```

### 5. Duplicate email protection

```ts
// Before creating a new user doc, check if another doc already has this email
const emailQuery = query(collection(db, 'users'), where('email', '==', email));
const emailSnap = await getDocs(emailQuery);
const existing = emailSnap.docs.find(d => d.id !== uid);
if (existing) {
  // Merge into existing doc instead of creating duplicate
  await setDoc(existing.ref, { uid, plan, updatedAt: Date.now() }, { merge: true });
  return;
}
// Safe to create new doc
```

### 6. Admin user list backfill

```ts
// After reading users, backfill missing email/name from Firebase Auth
const missing = users.filter(u => !u.email || !u.name);
if (missing.length > 0 && auth) {
  const fbUsers = await Promise.allSettled(
    missing.map(u => auth.getUser(u.id).catch(() => null))
  );
  fbUsers.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) {
      const fb = result.value;
      if (!missing[i].email && fb.email) missing[i].email = fb.email;
      if (!missing[i].name && fb.displayName) missing[i].name = fb.displayName;
    }
  });
}
```

---

## Firestore Rules Enforcement

In `firestore.rules`, add `email` to the blocked keys list so clients cannot
overwrite it with a different value:

```ts
match /users/{uid} {
  allow update: if isSelf(uid)
                && !request.resource.data.diff(resource.data).affectedKeys()
                   .hasAny([
                     'plan', 'createdAt', 'email',  // ← email must be here
                     'referralCredits', 'referralCode', ...
                   ]);
}
```

---

## Required Firestore Index

Create `firestore.indexes.json` at the project root with an index on
`users.email` for efficient duplicate detection:

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "email", "arrayConfig": "NOT_ARRAY", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## One-Time Backfill Script

When you discover existing partial user documents, run this script from the
`ai-interview-admin` directory:

```bash
node -e "
const admin = require('firebase-admin');
// ... init admin SDK ...
const db = admin.firestore();
const auth = admin.auth();
const snap = await db.collection('users').get();
const missing = snap.docs.filter(d => !d.data().email || !d.data().name);
console.log('Found', missing.length, 'users missing email/name');
for (const doc of missing) {
  const fb = await auth.getUser(doc.id);
  const updates = {};
  if (!doc.data().email && fb.email) updates.email = fb.email;
  if (!doc.data().name && fb.displayName) updates.name = fb.displayName;
  if (Object.keys(updates).length > 0) {
    await doc.ref.set(updates, { merge: true });
    console.log('Fixed', doc.id);
  }
}
console.log('Done');
"
```

---

## Red Flags — STOP and Fix Immediately

If you see any of these patterns in code, they will cause the exact bugs
reported in this session:

1. `setDoc(doc(db, 'users', uid), { plan, updatedAt })` — missing `email`/`name`
2. `catch (e) { console.warn(...); }` in `ensureUserDocs` — silent failure
3. Admin user list returning `email: ''` for existing users
4. Firestore rules that allow clients to write `email` without restriction
5. No backfill path from Firebase Auth for missing identity fields
6. Checkout page writing to `users/{uid}` without including identity fields
7. No `ensureUserDocExists` recovery guard in `onAuthStateChanged` — a failed
   sign-in transaction can leave Firebase Auth users without any Firestore doc

---

## Lessons Learned (2026-08-03)

- **Silent failures in `ensureUserDocs`** left users with no Firestore profile
- **Checkout page** then created partial docs with only `plan` + `updatedAt`
- **`persistSubscription`** never backfilled identity — server-side only wrote plan
- **No duplicate email check** meant same email could register under multiple UIDs
- **`collectionGroup('days')`** polluted admin activity map with stray subcollections
- **Result**: Admin panel showed UIDs instead of emails, duplicate-looking data
