---
name: firebase-auth-flows
description: >
  Use when working with Firebase Auth in the AI Tutor desktop app or landing web app.
  Triggers: modifying login/logout, Google sign-in, guest mode, heartbeats,
  auth state listeners, user profile creation/migration, ID token handling,
  or files in ai-interview-helper/src/features/auth/, ai-interview-helper/src/services/firebase/auth.service.ts,
  ai-interview-landing/hooks/useAuth.ts, ai-interview-landing/lib/auth.ts.
  Covers auth patterns for both Electron desktop and Next.js web contexts.
---

# Firebase Auth Flows

## Overview

Two auth contexts share the same Firebase project but have different implementations:

| Context | Location | Method |
|---|---|---|
| Desktop (Electron) | `ai-interview-helper/src/features/auth/` | Google sign-in via popup + guest mode |
| Web (Next.js) | `ai-interview-landing/hooks/useAuth.ts` | Google sign-in via popup |

Both write user profiles to Firestore `users/{uid}` and subscriptions to `subscriptions/{uid}`.

---

## Desktop Auth (`ai-interview-helper`)

### Key Files

| File | Purpose |
|---|---|
| `src/services/firebase/auth.service.ts` | Auth operations: `signInWithGoogle`, `logOut`, `getIdToken`, `createGuestUser`, `recordHeartbeat`, `onAuthStateChangeListener` |
| `src/features/auth/useAuth.ts` | React hook: subscribes to auth state, sets up heartbeat interval, listens to `users/{uid}` for plan changes |
| `src/features/auth/LoginScreen.tsx` | UI: Google sign-in button, guest mode button |
| `src/store/auth.store.ts` | Zustand store: `user`, `plan`, `isLoading` |

### Sign-In Flow

```
User clicks "Sign in with Google"
    │
    ▼
signInWithPopup(auth, GoogleAuthProvider)
    │
    ▼
runTransaction on users/{uid}
    ├─ If doc doesn't exist → create with uid, email, name, plan='free', createdAt, settings
    └─ If exists → migrate legacy plan IDs if needed
    │
    ▼
useAuth hook picks up onAuthStateChanged
    ├─ Sets user in Zustand store
    ├─ Records heartbeat (lastSeen, appVersion, platform)
    ├─ Starts 5-minute heartbeat interval
    └─ Subscribes to users/{uid} onSnapshot for real-time plan sync
```

### Guest Mode

- `createGuestUser()` returns a synthetic `User` object with `uid: 'local-guest'`
- No Firestore write occurs
- `isFirebaseConfigured` guard: if Firebase isn't initialized, auth functions queue a microtask that calls `callback(null)`
- Guest users have `plan: 'free'` and no subscription

### Heartbeat

- `recordHeartbeat(uid)` writes `{ lastSeen: Date.now(), appVersion, platform }` to `users/{uid}` with `merge: true`
- Called once on sign-in, then every 5 minutes via `setInterval`
- Best-effort: catches and logs errors, never throws into auth flow
- Platform detection: `/Win/i` → `'win'`, `/Mac/i` → `'mac'`, else `'other'`
- `appVersion` comes from `__APP_VERSION__` global (injected at build time)

### Auth State Listener

- `onAuthStateChangeListener(callback)` wraps Firebase's `onAuthStateChanged`
- Returns unsubscribe function
- If Firebase isn't configured, immediately calls `callback(null)` and returns no-op unsubscribe
- Error callback also calls `callback(null)` to avoid stuck loading states

### ID Token

- `getIdToken()` returns the current Firebase ID token (`auth.currentUser.getIdToken()`)
- Used to authenticate desktop app requests to server-side AI proxy
- Returns `null` for guest/unauthenticated sessions
- Desktop app sends it to main process via `window.electronAPI.groqKeyFetch({ idToken })`

### Plan Sync

- `useAuth` subscribes to `users/{uid}` via `onSnapshot`
- When `plan` field changes in Firestore (e.g., after Razorpay webhook), Zustand store updates automatically
- If plan drops below `'power'`, Desi Mode is disabled via `useProfileStore.getState().setDesiMode(false)`

### Recovery Guard: `ensureUserDocExists`

Every `onAuthStateChanged` callback should call `ensureUserDocExists(uid)` before
any other user-dependent logic. This prevents the admin panel from silently
dropping users when a Firebase Auth account exists but `users/{uid}` is missing.

```ts
// desktop: src/services/firebase/auth.service.ts
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
// desktop: src/features/auth/useAuth.ts
if (firebaseUser) {
  setUser(firebaseUser);
  void ensureUserDocExists(firebaseUser.uid); // ← recovery guard
  void recordHeartbeat(firebaseUser.uid);
  ...
}
```

```ts
// landing: hooks/useAuth.ts
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

---

## Web Auth (`ai-interview-landing`)

### Key Files

| File | Purpose |
|---|---|
| `hooks/useAuth.ts` | React hook: Google sign-in, auth state listener |
| `lib/auth.ts` | Auth helpers: `getCurrentUser`, `requireAuth`, `getIdToken` |
| `app/api/auth/` | Auth API routes if any |

### Pattern

- Same `signInWithPopup` + Google provider pattern
- User profile creation happens server-side or client-side depending on the flow
- Landing app uses Next.js server components for some auth-gated pages

---

## User Profile Schema (`users/{uid}`)

```ts
{
  uid: string;
  email: string;
  name: string;
  plan: PlanId;              // 'free' | 'quick_pass' | 'pro' | 'power'
  createdAt: number;
  settings: {
    theme: 'light' | 'dark';
    language: string;
  };
  lastSeen: number;          // heartbeat timestamp
  appVersion: string;        // desktop app version
  platform: 'win' | 'mac' | 'other';
}
```

---

## Common Patterns

### Guarding Firebase Operations

Always check `isFirebaseConfigured && db` before Firestore operations:

```ts
if (!isFirebaseConfigured || !db) return;
```

### Transaction for User Creation

Use `runTransaction` to prevent duplicate user docs on concurrent login:

```ts
await runTransaction(db, async (tx) => {
  const snap = await tx.get(userDocRef);
  if (!snap.exists()) {
    tx.set(userDocRef, { ...newUser });
  }
});
```

### Plan Migration

Legacy plans (`starter`, `standard`, `pro`) are migrated to new IDs (`quick_pass`, `power`) via `migratePlanId()` from `pricing-config.ts`.

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Forgetting heartbeat cleanup on logout | Always clear interval + unsubscribe snapshot in useEffect cleanup |
| Writing user doc without transaction | Use `runTransaction` to avoid race conditions on concurrent sign-ins |
| Assuming auth is initialized | Check `isFirebaseConfigured` before calling Firebase methods |
| Hardcoding plan values | Use `migratePlanId` and `getPlanById` from `pricing-config.ts` |
| Stale closure in auth listener | Use `useRef` for unsubscribe functions, cleanup in useEffect return |
