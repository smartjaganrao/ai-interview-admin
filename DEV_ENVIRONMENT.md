# Dev / Staging Environment Setup — Admin Panel

Same strategy as `ai-interview-landing/DEV_ENVIRONMENT.md`: same variable names, different
values per Vercel environment. Production (`main` push) always uses prod Firebase.

## Local dev (`npm run dev`)

`.env.development.local` is already wired (gitignored) to point at `ai-interview-tutor-dev`.
It covers all `NEXT_PUBLIC_FIREBASE_*` vars.

**The one var it can't pre-fill:** `FIREBASE_ADMIN_SDK_JSON` — the dev service-account JSON.
Add it to `.env.development.local` (or `.env.local`) when you need to exercise server routes
locally:

```
FIREBASE_ADMIN_SDK_JSON={"type":"service_account",...entire JSON on one line...}
```

Get the dev service-account from Firebase console → `ai-interview-tutor-dev` →
**Project settings → Service accounts → Generate new private key**.

## Vercel Preview deploys

All vars below are set in Vercel → project → Settings → Environment Variables,
scoped to **Preview** (+ Development). Production values are untouched.

| Variable | Preview/Dev value |
|----------|-------------------|
| `NEXT_PUBLIC_FIREBASE_*` (×6) | `ai-interview-tutor-dev` config |
| `FIREBASE_ADMIN_SDK_JSON` | dev service account (one-line JSON) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | `rzp_test_…` (optional) |
| `RAZORPAY_WEBHOOK_SECRET` | test webhook (optional) |

## Granting yourself admin in the dev project (one-time)

The dev Firebase project starts with no admin users. Run this once after first login on a
preview build (first sign-in creates the Firebase account, then the script grants the claim):

```bash
# Temporarily add dev service-account to .env.local, then:
node scripts/grant-admin.mjs smartjaganrao@gmail.com
# Remove or revert .env.local after — don't leave dev credentials there permanently
```

Sign out and back in to get a fresh ID token with the claim attached.

## ⚠️ Admin-specific caveat

Admin actions (ban user, change plan, reset quota) hit **whichever Firebase project the
running instance points at**. In a Preview deploy that's the dev project — safe to experiment.
On production (`main`) it's real users. Always verify which project a deploy targets before
running destructive admin actions.
