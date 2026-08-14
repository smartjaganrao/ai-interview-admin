---
name: creator-referral-logic
description: Use before editing pricing, peer referral, or the creator commission program in ai-interview-landing/lib/firebase-admin.ts — dense cross-cutting business logic, read the specific functions instead of the whole file.
---

# Creator & referral logic — go straight to the functions

All of it lives in `ai-interview-landing/lib/firebase-admin.ts`. Don't re-read the whole file — jump to:

- `PAID_DAILY_LIMITS` (~line 69) and `getUserPlan()` (~line 76) — plan resolution; `getUserPlan` prefers `users.plan` first before falling back, which matters for freshness after a plan change.
- Peer referral functions — ₹100/₹100 account credit, applied at checkout.
- `CREATOR_COMMISSION_BPS` (~line 380, currently 2000 = 20.00%, per-creator override allowed) and the creator functions starting ~line 382: `creatorCodeBase()`, apply-to-become-a-creator (~393), creator summary read (~429), attribution logic (~451, first-touch wins, guards self-attribution/inactive creators/stale >24h accounts).

**Invariant:** all credit/commission mutations are Admin-SDK-only. Client-facing credit fields on `users/{uid}` are rule-protected — see [[firestore-rules-sync]] if you're changing what fields the client can read/write.

**Payouts:** manual, monthly, via UPI — triggered from admin panel `/creators` page or `npm run creator-payouts`. Not automated; don't assume a cron/webhook does this.

Gated on Razorpay **live keys** (KYC) to move real money — check current key mode before assuming referral/commission payouts affect real currency; see [[billing-webhook-safety]].
