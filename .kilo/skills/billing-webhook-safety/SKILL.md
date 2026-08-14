---
name: billing-webhook-safety
description: Use when editing the Razorpay webhook handler or any payment/credit-granting code path in ai-interview-landing — there is no dev/staging Firestore, so webhook bugs write directly to production billing state.
---

# Razorpay webhook — production-only, no staging safety net

Handler: `ai-interview-landing/app/api/razorpay/webhook/route.ts`.

Because there is **no dev/staging Firestore** (deliberate, confirmed with the user — see root `CLAUDE.md`), every webhook event this handler processes writes directly to production: plan upgrades, credits, commission accrual. There is no environment to safely test a broken handler against real-shaped events.

Before changing this route, check for and preserve:
- **Signature verification** on the incoming webhook payload — never process an unverified event.
- **Idempotency** — Razorpay can redeliver the same event; a handler that isn't idempotent can double-grant credit or double-upgrade a plan on retry. Check how the current code guards against reprocessing (e.g. recording processed event IDs) before assuming a change is safe.
- **Key mode** — confirm whether live or test Razorpay keys are active before reasoning about whether a bug would move real money; see [[creator-referral-logic]] for where commission payouts key off this same billing state.

If you need to test a change, do not send real webhook traffic through production — use Razorpay's test-mode webhook simulator/CLI against test keys, not the live endpoint.
