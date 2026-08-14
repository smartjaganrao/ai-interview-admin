---
name: electron-macos-windows-build
description: Use when building or packaging the ai-interview-helper desktop app locally (Mac DMG or Windows portable exe) — covers required tooling, known build failures, and unsigned-app symptoms. Does not authorize publishing; see desktop-release-gate for that.
---

# Building ai-interview-helper locally

App id `com.javihai.app`. See [[macos-setup-platform-binaries]] in user memory first if `node_modules` doesn't work (it was originally installed on Windows).

**Shipping to users:** do **not** publish from these local commands by default. Prefer the GitHub Actions **Release** workflow (tag `v*` push) documented in [[desktop-release-gate]]. Use local builds for preflight validation with `--publish never`.

**Mac (universal DMG):** config in `package.json` → `build.mac` (dmg/universal, `identity: null`, unsigned).
```
npm run build && CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --publish never
```
Universal build fails on `@napi-rs/canvas` (transitive via `pdfjs-dist`) — only arm64 installs, x64 half can't build. Already excluded via `"!**/node_modules/@napi-rs/**"` in `build.files` (canvas is only used for PDF *rendering*; the app only does text extraction, so exclusion is safe).

**Windows (portable exe), built from macOS:** needs Wine (`brew install --cask wine-stable`, requires sudo for a GStreamer .pkg — not doable non-interactively) and Rosetta 2 (`softwareupdate --install-rosetta --agree-to-license`). Wine Stable 11 often exposes `wine` but not `wine64`; if electron-builder cannot find `wine64`, put a shim on `PATH` (`ln -sf "$(command -v wine)" /tmp/javihai-wine-bin/wine64` and `export PATH="/tmp/javihai-wine-bin:$PATH"`). Then:
```
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --publish never
```

CI builds Windows natively on `windows-latest` (no Wine) via `.github/workflows/release.yml`.

**Icons:** source art is `public/favicon.svg` (purple lightning glyph). `public/icon.png` / `public/tray-icon.png` (+@2x) generated via `rsvg-convert` from `build-assets/icon.svg` / `build-assets/tray.svg`. electron-builder auto-generates `.icns`/`.ico` from `public/icon.png`. Tray icon must be listed in `build.files` (`public/` isn't packaged otherwise) — `main.js` loads it from `<appDir>/public/tray-icon.png`.

**Unsigned-app symptoms (no paid Apple Developer ID):**
- *"Apple could not verify…JavihAI"* on first open → quarantined: `xattr -dr com.apple.quarantine /Applications/JavihAI.app`.
- *Mic permission re-prompts even after Allow* → ad-hoc signing has no stable identity, so TCC can't persist the grant. Fix: self-signed cert (`scripts/setup-signing-cert.sh`, one-time, no sudo) → `scripts/sign-mac.sh` re-signs the built app → `tccutil reset Microphone com.javihai.app` → relaunch. Wired into `build.afterSign` via `build-assets/after-sign.cjs` (auto-runs if the cert exists).
- Free signing does **not** remove the Gatekeeper download warning (needs paid notarization) or Windows SmartScreen (needs paid cert) — only fixes the mic re-prompt and gives a stable identity.

**Both builds are unsigned by default.** This skill covers building only — publishing a release is gated separately by [[desktop-release-gate]] and must not be run without explicit request.

### NSIS config compatibility note
- `build.nsis` options like `compression`, `solid`, and `deleteAppDataOnUninstall` are valid in electron-builder's schema, but **building from macOS with `--win` fails validation** because electron-builder 26.15.3 validates the entire `build` config object including nested platform configs.
- **Workaround:** Keep `build.nsis` minimal for cross-platform builds. Test NSIS-specific options natively on Windows or in CI. The original minimal config (`oneClick`, `perMachine`, `allowElevation`, `allowToChangeInstallationDirectory`, `artifactName`) builds reliably on all platforms.

### Windows NSIS integrity errors
- If users report *"Installer integrity check has failed"*, the cause is almost always a **corrupted download** or **real-time antivirus scanning** interfering with the installer, not the NSIS config.
- **Workarounds:** Use the portable `.exe`, verify SHA256 checksums, temporarily exclude the installer from antivirus, or re-download.
