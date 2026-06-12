# Hotfix & Rollback Runbook — Admin Panel

Internal super-admin panel, deployed on **Vercel** (project `ai-interview-admin`).

## ⚠️ Read this first — the branch gotcha
- **Vercel Production Branch is `main`.** Pushing to `main` deploys to the live admin URL.
- The git **`production` branch is a trap**: it is GitHub's *default* branch but it is **NOT** Vercel's production branch, and it has an **unrelated history** from `main`. Pushes to `production` only create **Preview** deploys — they do **not** go live. Don't deploy through it.
- Recommended cleanup (separate task): delete or rename the `production` branch, or set GitHub's default to `main`, so this can't bite again.

## If production is broken → ROLL BACK FIRST (seconds, no code)
1. Vercel dashboard → project **ai-interview-admin** → **Deployments**.
2. Pick the last healthy deployment → **⋯ → Promote to Production**.
3. Then fix forward on a branch.

## Normal fix flow
```bash
git checkout main && git pull
git checkout -b fix/<short-desc>
# ...fix...
npm run build          # Next.js 16 — must compile locally (see AGENTS.md)
git commit -am "fix: <desc>" && git push -u origin fix/<short-desc>
gh pr create --base main      # PR gets a Preview URL; test there
gh pr merge --merge           # merge to main → production deploys
```

## ⚠️ Backend caveat
Previews hit the **production Firebase** project (real users/subscriptions) and admin actions mutate real data. Test destructive flows (ban, plan change, quota reset) against a **dev Firebase** project, not from a preview.

## Release-version card
The dashboard "Desktop App" card version + links live in `DESKTOP_APP` at the top of `app/page.tsx` — bump it whenever a new desktop release ships.

## Pre-merge checklist
- [ ] `npm run build` passes locally
- [ ] Tested on the PR Preview URL
- [ ] Merging to **`main`** (never `production`)
- [ ] No real-user-data mutation untested against dev
