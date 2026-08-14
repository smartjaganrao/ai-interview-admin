---
name: desktop-release-gate
description: >-
  Ships the JavihAI desktop app (ai-interview-helper) via GitHub Actions Release
  workflow for Mac DMG + Windows exe together, then syncs landing/admin. Use when
  the user mentions desktop release, publish, GitHub release, electron-builder
  publish, DMG, Windows exe, v* tag, Release workflow, or post-release version sync.
---

# Desktop release gate

Real users install binaries from GitHub Releases. Treat every release as production.

Companion skills: [[electron-macos-windows-build]] (local package only), [[preflight-verification]] (checks only), [[update-all-repos]] (cross-repo), [[vercel-deploy-branches]] (landing/admin deploy).

## Hard rules

1. **No publish without an explicit ask in this session** — no `v*` tag push, Release workflow dispatch, `gh release create`, or `electron-builder --publish`. Prior approval does not carry over. Local `--publish never` is OK for build/validate.
2. **Mac + Windows together** — same version, same GitHub release tag. Never ship one OS alone.
3. **Confirm again immediately before publish** — state version, that both OS will be built/uploaded, and wait for a clear yes.
4. **Tag = `v` + `package.json` version** — e.g. `1.13.6` → `v1.13.6`. Workflow fails if they diverge. Do not reuse a shipped tag unless the user explicitly wants asset overwrite.

## Preferred path — GitHub Actions

Workflow: `ai-interview-helper/.github/workflows/release.yml` (name **Release**).

Parallel jobs: Windows (`windows-latest`) + macOS (`macos-latest`) → upload to one release with `gh release upload --clobber`.

### Checklist

Copy and track:

```
Release progress:
- [ ] Preflight (test/lint/build) green on helper
- [ ] Version bumped in package.json (+ README Latest release)
- [ ] User confirmed version + Mac+Windows publish
- [ ] Commit pushed to main
- [ ] Tag vX.Y.Z pushed (or workflow_dispatch with same tag)
- [ ] Both CI jobs green
- [ ] Release assets verified
- [ ] Landing sync-version committed + pushed
- [ ] Live javihai.in/api/release shows new tag (cache ≤10m)
```

### Publish commands (after confirmation)

```bash
cd ai-interview-helper
# bump package.json version first, commit release-ready code
git push origin main
git tag vX.Y.Z
git push origin vX.Y.Z

gh run list --workflow=Release --repo smartjaganrao/ai-interview-helper --limit 3
gh run watch <run-id> --repo smartjaganrao/ai-interview-helper --exit-status
gh release view vX.Y.Z --repo smartjaganrao/ai-interview-helper
```

### Required assets on the release

- `JavihAI-vX.Y.Z-mac-universal.dmg` (+ blockmap)
- `JavihAI-vX.Y.Z-win-x64.exe` (+ blockmap)
- `JavihAI-vX.Y.Z-portable-win-x64.exe`
- `latest-mac.yml`, `latest.yml`

### Manual dispatch (tag already on the intended commit)

```bash
gh workflow run Release --repo smartjaganrao/ai-interview-helper -f tag=vX.Y.Z
```

`inputs.tag` is required. Never dispatch without it (`main` breaks artifact names).

## After release — cross-repo sync (required)

1. **Landing** (hardcoded FALLBACK must not lag):

```bash
cd ai-interview-landing
npm run sync-version   # writes lib/github-release.ts FALLBACK from helper package.json
# commit + push main → Vercel production (javihai.in)
```

2. **Admin** — no version file; dashboard proxies `https://javihai.in/api/release`. Confirm after landing is live.

3. **Verify**:

```bash
curl -sS https://javihai.in/api/release
# expect "version":"vX.Y.Z"
```

Live fetch uses GitHub `/releases/latest` with ~10 minute Next cache; FALLBACK covers GitHub outages.

## Local preflight (optional, preferred before tagging)

See [[electron-macos-windows-build]]. Always use `--publish never`.

```bash
cd ai-interview-helper
npm test && npm run build
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --publish never
# Wine Stable may need wine64 PATH shim — see electron-macos-windows-build
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --publish never
```

Validate launch + core flows (auth, listen, screenshot, stealth, opacity). Report **both** platforms together before asking for publish confirmation.

Default ship path is **CI**, not local `electron-builder --publish` / ad-hoc `gh release create`.

## Known issues and workarounds

### NSIS config compatibility (electron-builder 26.15.3)
- `compression`, `solid`, and `deleteAppDataOnUninstall` are valid NSIS options but **fail validation when building from macOS** because electron-builder validates the entire `build` config object, including platform-specific nested configs, even when building a single platform.
- **Workaround:** Keep the NSIS config minimal (`oneClick`, `perMachine`, `allowElevation`, `allowToChangeInstallationDirectory`, `artifactName`). Test Windows builds natively on Windows or in CI (`windows-latest`).
- **For users seeing NSIS integrity errors:** This is almost always a corrupted download or antivirus interference, not a builder config bug. Direct them to the portable `.exe` and SHA256 checksums.

### Mac TCC permission persistence
- The permanent fix requires **stable code identity** (self-signed cert or paid Apple Developer ID). Ad-hoc signing (`identity: null`) causes TCC to forget grants on every launch.
- The `main.js` startup warm-up (`systemPreferences.requestMediaAccess('microphone')`) shows the TCC dialog once at startup, before the renderer loads.

## Scope

Do not bundle unrelated refactors into a release commit. “Just build/package” ≠ release — confirm scope first.
