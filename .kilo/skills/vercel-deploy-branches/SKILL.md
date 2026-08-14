---
name: vercel-deploy-branches
description: Use before pushing to deploy, checking deploy status, or rolling back ai-interview-landing or ai-interview-admin — admin's GitHub default branch is a Preview-only trap that looks like it should be production but isn't.
---

# Vercel deploy topology — the admin branch trap

Each web app is its own git repo + Vercel project with git-integration auto-deploy.

- **ai-interview-landing** → Vercel project `ai-interview-landing`, **production branch = `main`**. Live at **javihai.in**. Push to `main` = production; other branches/PRs = Preview URLs.
- **ai-interview-admin** → Vercel project `ai-interview-admin`, **production branch = `main`**. ⚠️ **Trap:** GitHub's *default* branch for this repo is `production`, which has an unrelated git history from `main` and only produces Preview deploys — pushing there does **not** go live. Always ship via `main`, not `production`, regardless of what the GitHub default branch suggests.
- **ai-interview-helper** (desktop) → not Vercel; GitHub Releases + electron-updater, no instant rollback since it's installed binaries. See [[electron-macos-windows-build]] and [[desktop-release-gate]].

**Rollback (web only):** Vercel dashboard → project → Deployments → last healthy deploy → ⋯ → Promote to Production. Instant, no code change needed. A failed build never goes live — the previous deploy stays serving. Full runbooks live in each repo's `HOTFIX.md`.

**Firestore rules do not deploy through Vercel at all** — see [[firestore-rules-sync]] for that separate step.

Since 2026-07-17 the app is in a released stable state — double-check which branch you're pushing before any deploy-triggering push, per [[stable-release-care]].
