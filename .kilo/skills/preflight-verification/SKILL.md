---
name: preflight-verification
description: Use before committing or releasing in any of the three JavihAI repos — run git/status, install, typecheck, lint, build, and config checks only; never commit or publish from this skill.
---

# Pre-Flight Verification Skill

## When to use
- Before committing or releasing code in any of the 3 repos
- Running build/lint/typecheck/tests across all repos
- Validating env vars, Firestore rules, and config before deploy
- Ensuring all repos are in a clean, buildable state
- Running CI-equivalent checks locally

## Core rule: verify, never commit or release

This skill is for **validation only**. It does NOT:
- Commit code
- Push to remote
- Create git tags
- Trigger releases
- Deploy to Vercel or GitHub Actions

## Repos
- Landing: `ai-interview-landing/`
- Admin: `ai-interview-admin/`
- Desktop: `ai-interview-helper/`

## Verification checklist

### 1. Git status (all repos)
```bash
for dir in ai-interview-landing ai-interview-admin ai-interview-helper; do
  echo "=== $dir ==="
  (cd "$dir" && git status --short)
done
```
Expected: clean working tree or only expected uncommitted files.

### 2. Install dependencies (all repos)
```bash
for dir in ai-interview-landing ai-interview-admin ai-interview-helper; do
  echo "=== $dir ==="
  (cd "$dir" && npm install --silent)
done
```

### 3. Build (all repos)
```bash
for dir in ai-interview-landing ai-interview-admin ai-interview-helper; do
  echo "=== $dir ==="
  (cd "$dir" && npm run build)
done
```

### 4. Lint (all repos)
```bash
for dir in ai-interview-landing ai-interview-admin ai-interview-helper; do
  echo "=== $dir ==="
  (cd "$dir" && npm run lint)
done
```

### 5. Typecheck (all repos)
```bash
for dir in ai-interview-landing ai-interview-admin ai-interview-helper; do
  echo "=== $dir ==="
  (cd "$dir" && npm run typecheck)
done
```

### 6. Tests (desktop only)
```bash
cd ai-interview-helper
npm run test
```

### 7. Env vars present
```bash
# Landing
test -f ai-interview-landing/.env.local && echo "landing .env.local OK" || echo "MISSING: landing .env.local"

# Admin
test -f ai-interview-admin/.env.development.local && echo "admin .env.development.local OK" || echo "MISSING: admin .env.development.local"

# Desktop
test -f ai-interview-helper/.env && echo "helper .env OK" || echo "MISSING: helper .env"
test -f ai-interview-helper/config.json && echo "helper config.json OK" || echo "MISSING: helper config.json"
```

### 8. Firestore rules valid
```bash
cd ai-interview-helper
firebase deploy --only firestore:rules --dry-run
```
Or validate via Firebase Console rules editor.

### 9. Vercel project links (landing + admin)
```bash
test -f ai-interview-landing/.vercel/project.json && echo "landing linked" || echo "UNLINKED: landing"
test -f ai-interview-admin/.vercel/project.json && echo "admin linked" || echo "UNLINKED: admin"
```

### 10. Package versions aligned (spot check)
```bash
echo "=== firebase ==="
grep '"firebase"' ai-interview-landing/package.json ai-interview-admin/package.json ai-interview-helper/package.json
echo "=== react ==="
grep '"react"' ai-interview-landing/package.json ai-interview-admin/package.json ai-interview-helper/package.json
echo "=== react-dom ==="
grep '"react-dom"' ai-interview-landing/package.json ai-interview-admin/package.json ai-interview-helper/package.json
```

## Desktop pre-release verification

Before any desktop release attempt:
```bash
cd ai-interview-helper
npm run build
npm run typecheck
npm run test
npm run electron-build
ls release/*.dmg release/*.exe 2>/dev/null || echo "No release artifacts (expected for local build)"
```

## Landing page pre-deploy verification
```bash
cd ai-interview-landing
npm run build
npm run lint
npm run typecheck
```

## Admin panel pre-deploy verification
```bash
cd ai-interview-admin
npm run build
npm run lint
npm run typecheck
```

## Common validation failures and fixes

| Failure | Cause | Fix |
|---------|-------|-----|
| `npm run build` fails | Type errors or missing deps | Run `npm install`, fix TS errors |
| `npm run lint` fails | ESLint errors | Fix reported issues |
| `npm run typecheck` fails | TypeScript errors | Fix type mismatches |
| `firebase deploy --dry-run` fails | Rules syntax error | Fix `firestore.rules` |
| Missing `.env.local` | Env file not created | Copy from `.env.example` and fill in |
| Vercel unlinked | `.vercel/project.json` missing | Run `vercel link --yes` |
| Version drift | `package.json` versions misaligned | Use `update-all-repos` skill to bump |

## After verification passes

Once all checks pass, you may:
1. Review the diff: `git diff`
2. Commit: `git add -A && git commit -m "..."`  ← outside this skill's scope
3. Push/deploy/release ← outside this skill's scope
