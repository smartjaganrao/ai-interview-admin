---
name: verify-ui-change
description: Use after any interactive UI change (button, modal, form) in ai-interview-landing or ai-interview-admin, before reporting it as fixed/done. Passing tsc/build only proves compilation, not clickability.
---

# Verify UI change

Run in this exact order — don't stop at step 2 for anything interactive:

1. `npx tsc --noEmit` in the affected repo (`ai-interview-landing/` or `ai-interview-admin/`).
2. `npm run build` in that repo (catches Next.js-specific errors tsc misses).
3. For anything interactive (modals, forms, buttons): `preview_start` (reads the repo's `.claude/launch.json`), then use `document.elementFromPoint(x, y)` at the target's screen coordinates to confirm the *intended* element is topmost — not a pseudo-element, overlay, or competing fixed-position widget.
   - Known trap: `.card-glow::before` in `ai-interview-landing/app/globals.css:152` is a decorative overlay (`position: absolute; inset: -1px`) sitting on top of card content. It must keep `pointer-events: none` (already set) or it silently swallows clicks on real inputs inside — no console error, nothing in network tab. If a `card-glow` card seems unresponsive, check this class first before assuming a JS bug.
4. Delete any throwaway test routes created for step 3 before committing.

Only report the UI fix as working after step 3 passes — a correct-looking screenshot is not sufficient proof.

See also [[stable-release-care]] in user memory: since 2026-07-17 the app is in a released stable state, so treat regressions here as user-facing, not just dev inconvenience.
