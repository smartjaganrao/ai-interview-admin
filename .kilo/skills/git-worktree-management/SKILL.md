---
name: git-worktree-management
description: Use when creating, listing, or cleaning sibling *.worktrees/ checkouts for ai-interview-landing, ai-interview-admin, or ai-interview-helper parallel feature work.
---

# Git Worktree Management Skill

## When to use
- Working with `ai-interview-landing.worktrees/` or `ai-interview-admin.worktrees/`
- Understanding why `.worktrees` directories exist alongside the main repo
- Setting up isolated worktrees for parallel feature development
- Cleaning up stale worktrees

## Worktree directories
```
ai-interview-landing.worktrees/    ← contains git worktree checkouts of ai-interview-landing
ai-interview-admin.worktrees/      ← contains git worktree checkouts of ai-interview-admin
ai-interview-helper.worktrees/     ← empty (no worktrees created yet)
```

These are **sibling directories** to the main repos, not inside them. They contain full git worktree checkouts that share the same `.git` directory as the parent repo.

## What they're for
VS Code's "New Worktree" feature creates these. They allow:
- Working on a feature branch in isolation without switching the main checkout
- Running multiple dev servers simultaneously (e.g., landing on port 3000, worktree on port 3002)
- Keeping the main `main` branch checkout clean for hotfixes

## Creating a worktree
```bash
cd ai-interview-landing
git worktree add ../ai-interview-landing.worktrees/feature-name -b feature/name
```

Or via VS Code: Source Control → ... → Worktrees → Create Worktree

## Listing worktrees
```bash
cd ai-interview-landing
git worktree list
```

## Removing a worktree
```bash
cd ai-interview-landing
git worktree remove ../ai-interview-landing.worktrees/feature-name
```

## Gotchas
- Worktrees share the same `.git` — branches checked out in worktrees cannot also be checked out in the main repo
- Stale worktree directories can accumulate — clean them up when features are merged
- `npm install` must be run separately in each worktree (node_modules is not shared)
- The `.worktrees` directories are gitignored in the main repo (`.gitignore` in parent folder)
- Worktrees are local-only — they don't sync to remote unless the branch is pushed
