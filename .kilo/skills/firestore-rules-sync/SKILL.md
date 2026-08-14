---
name: firestore-rules-sync
description: Use whenever a task changes client-side Firestore access patterns (new collection, new field read/write from the browser) in ai-interview-landing or ai-interview-admin — the rules file lives in a different repo and deploying rules is a separate step from git push.
---

# Firestore rules live in a different repo, and deploy separately

`firestore.rules` physically lives in `ai-interview-helper/` (historical reasons) but governs client-side Firestore access for **all three apps** — landing, admin, and helper. If you add/change a collection or field that the browser (not just Admin SDK server code) reads or writes in landing or admin, check/update the rules from `ai-interview-helper/firestore.rules` even though the task itself is in a different repo.

**Rules do not deploy via git push.** A push to `main` deploys the web app to Vercel; it does **not** publish Firestore rules. Deploy rules explicitly with:

```
cd ai-interview-landing && FIREBASE_ADMIN_SDK_JSON="$(...)" node scripts/deploy-firestore-rules.mjs
```

The landing repo's `.env.local` has no Admin SDK credential — pull `FIREBASE_ADMIN_SDK_JSON` from `ai-interview-admin/.env.local` instead. Same credential is used by `npm run creator-payouts` and `setup-firestore.mjs`. Rules must be re-published after any DB recreation.

Also see [[firestore-collection-keying]] and [[firestore-usage-quota]] for the specific collection shapes rules commonly need to match.
