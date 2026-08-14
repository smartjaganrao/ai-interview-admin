---
name: admin-bulk-user-actions
description: Use when adding or modifying any bulk action (ban, delete, upgrade, refund, reset-quota) on ai-interview-admin's Users page or its API routes — the acting admin's own account must always be excluded.
---

# Bulk user action safety

Any bulk action on users (ban, delete, and similar) must exclude the acting admin's own account, or an admin can accidentally lock themselves out.

- Reference implementation/pattern to follow: `ai-interview-admin/app/users/page.tsx` and its API routes under `ai-interview-admin/app/api/users/` (`ban/route.ts`, `delete/route.ts`, `upgrade/route.ts`, `refund/route.ts`, `reset-quota/route.ts`).
- When adding a **new** bulk-action route, copy the existing self-exclusion check from `ban/route.ts` or `delete/route.ts` rather than re-deriving it.

Also applies [[firestore-collection-keying]] where relevant (e.g. deleting a user must also clean up doc-ID-keyed collections like `subscriptions/{userId}`, not just field-queryable ones).
