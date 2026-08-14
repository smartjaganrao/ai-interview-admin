---
name: update-all-repos
description: Use when installing or bumping shared dependencies, or running build/lint/typecheck across ai-interview-landing, ai-interview-admin, and ai-interview-helper together.
---

# Update All Repos Skill

## When to use
- Running `npm install` or updating dependencies across all 3 repos
- Running build/lint/typecheck across all repos after a shared dependency change
- Bumping a shared dependency version (firebase, react, next, etc.) consistently
- Pushing commits to all 3 repos after making changes
- Verifying all 3 repos are in a clean, buildable state

## Repos
- Landing: `ai-interview-landing/` — Next.js marketing site
- Admin: `ai-interview-admin/` — Next.js internal admin panel
- Desktop: `ai-interview-helper/` — Electron desktop app

## Shared dependencies to keep aligned

| Package | Landing | Admin | Desktop | Notes |
|---------|---------|-------|---------|-------|
| `firebase` | ^11.0.2 | ^12.13.0 | ^12.13.0 | Aim for same major.minor |
| `react` | ^19.2.5 | 19.2.4 | ^19.2.5 | Keep exact or patch-aligned |
| `react-dom` | ^19.0.1 | 19.2.4 | ^19.2.5 | Must match react |
| `groq-sdk` | ^1.2.1 | — | ^1.1.2 | Landing leads |
| `resend` | ^6.14.0 | ^6.14.0 | — | Keep aligned |
| `firebase-admin` | ^13.10.0 | ^13.10.0 | — | Keep aligned |
| `next` | ^16.2.6 | 16.2.6 | — | Keep exact |
| `typescript` | ^5.6.3 | ^5 | ~6.0.2 | Desktop can lag |

## Bootstrap / install all

```bash
for dir in ai-interview-landing ai-interview-admin ai-interview-helper; do
  echo "=== $dir ==="
  (cd "$dir" && npm install --silent)
done
```

## Run checks across all repos

```bash
for dir in ai-interview-landing ai-interview-admin ai-interview-helper; do
  echo "=== $dir ==="
  (cd "$dir" && npm run build && npm run lint && npm run typecheck)
done
```

Desktop-specific pre-checks before release:
```bash
cd ai-interview-helper
npm run build
npm run typecheck
npm run test
```

## Bump a shared dependency

Example: bump `firebase` to `^12.0.0` in all 3 repos

```bash
for dir in ai-interview-landing ai-interview-admin ai-interview-helper; do
  (cd "$dir" && npm install firebase@^12.0.0 --save)
done
```

After bumping:
1. Run build/lint/typecheck in each repo (see above)
2. Fix any breaking changes
3. Commit and push each repo separately

## Commit and push all repos

```bash
for dir in ai-interview-landing ai-interview-admin ai-interview-helper; do
  echo "=== $dir ==="
  (cd "$dir" && git add -A && git commit -m "chore: update deps" && git push)
done
```

## Known gotchas

- `ai-interview-landing` and `ai-interview-admin` both deploy to Vercel — push triggers a deploy
- `ai-interview-helper` triggers GitHub Actions on push to `main` (release workflow on tags)
- `firestore.rules` lives in `ai-interview-helper/` but governs all 3 apps' client-side access
- Desktop `package.json` version (currently `1.13.6`) is the source of truth for releases
- After every desktop GitHub release, sync landing fallback: `(cd ai-interview-landing && npm run sync-version)` then commit + push `main` (updates `lib/github-release.ts` FALLBACK). Admin has no hardcoded version — it proxies `https://javihai.in/api/release`
- Preferred desktop publish path is the GitHub Actions **Release** workflow (tag `v*`) — see [[desktop-release-gate]]
- `ai-interview-admin` uses `next.config.ts` while landing uses `next.config.js` — don't copy config files blindly
- Admin uses `@tailwindcss/postcss` v4 + Tailwind v4; landing uses Tailwind v3 — config formats differ

## Quick reference

| Task | Command |
|------|---------|
| Install all | `for d in landing admin helper; do (cd ai-interview-$d && npm install); done` |
| Build all | `for d in landing admin helper; do (cd ai-interview-$d && npm run build); done` |
| Lint all | `for d in landing admin helper; do (cd ai-interview-$d && npm run lint); done` |
| Typecheck all | `for d in landing admin helper; do (cd ai-interview-$d && npm run typecheck); done` |
| Push all | `for d in landing admin helper; do (cd ai-interview-$d && git add -A && git commit -m "chore" && git push); done` |
