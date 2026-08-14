---
name: admin-mrr-analytics
description: Use when touching MRR, revenue, or pricing logic in ai-interview-admin's analytics routes — MRR must be computed from each subscription's stored paid amount, never from the live pricing config.
---

# MRR computation rule

MRR is computed from each subscription document's actual paid `amount`/`billing` field, **not** from the current live pricing config.

- Source of truth: `ai-interview-admin/app/api/analytics/kpis/route.ts`.
- Related analytics routes that may share assumptions: `ai-interview-admin/app/api/analytics/revenue/route.ts`, `adoption/route.ts`, `cohorts/route.ts`.

**Why:** a subscriber's effective price must not retroactively change just because admin edits pricing later. If you find code deriving a subscriber's price from the current pricing config instead of the stored subscription amount, that's a bug, not a simplification opportunity.

Before editing, also check [[firestore-collection-keying]] — `subscriptions/{userId}` is doc-ID-keyed, not queryable by a `userId` field.
