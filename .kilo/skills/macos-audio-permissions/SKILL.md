---
name: macos-audio-permissions
description: >
  Fixes the macOS microphone and system audio permission re-prompt issue in
  ai-interview-helper. Triggers on: mac mic keeps asking, TCC re-prompt,
  permission denied loop, audio permission macOS, mic permission every launch,
  system audio permission mac, NSScreenCaptureUsageDescription, NSMicrophoneUsageDescription,
  ad-hoc signing TCC, stable code identity, requestMediaAccess, setPermissionRequestHandler,
  enumerateDevices labels empty, getUserMedia triggers TCC repeatedly.
---

# macOS Audio Permissions — Fix Re-prompt Permanently

## Root cause

macOS TCC (Transparency, Consent, and Control) binds permission grants to a
**stable code identity** (the code-signing certificate). The current default
`electron-builder` build uses `identity: null`, which produces an **ad-hoc**
signature with the unstable identifier `Electron`. Because the identity changes
on every build / reinstall, TCC cannot persist the grant and re-prompts on
every launch.

Secondary cause: the app warms TCC by calling `getUserMedia()` indirectly, but
never uses Electron's explicit `systemPreferences.requestMediaAccess('microphone')`
or `systemPreferences.getMediaAccessStatus('microphone')` as the source of
truth. On `not-determined` or first-run states, `enumerateDevices()` returns
devices with **empty labels**, which causes the renderer to call `getUserMedia()`
every mount — and with an unstable identity, each call surfaces a fresh TCC
dialog.

## Fix (3 layers, all required for permanence)

### Layer 1 — Stable code identity (build-time)

**Current state:** `package.json` → `build.mac.identity = null` (ad-hoc).

**Required change:** `package.json` → `build.mac.identity` must point to a
certificate that exists in the user's keychain. Two options:

**Option A — Self-signed cert (free, no Apple Developer account needed):**

1. Run `scripts/setup-signing-cert.sh` once on the build machine.
   This creates `JavihAI Code Signing` in `javihai-signing.keychain`.
2. Update `package.json`:

   ```json
   "mac": {
     "identity": "JavihAI Code Signing",
     "entitlements": "build-assets/entitlements.mac.plist",
     "entitlementsInherit": "build-assets/entitlements.mac.plist",
     ...
   }
   ```

3. The existing `build-assets/after-sign.cjs` already re-signs if the cert
   exists. With `identity` set, electron-builder uses it directly and the
   `afterSign` hook becomes a no-op (but still safe).

**Option B — Paid Apple Developer certificate:**

Replace the identity with your Team ID / certificate name from the Apple
Developer portal. This also notarizes the app and removes the Gatekeeper
warning. Not required for the permission fix — only for the download warning.

**Do NOT** leave `identity: null` for production Mac builds. Ad-hoc signing
guarantees TCC re-prompts.

---

### Layer 2 — Explicit `requestMediaAccess` at startup (main-process)

**Why:** `getUserMedia()` warms TCC indirectly, but the first call on a
`not-determined` system shows the dialog. After the user clicks Allow or
Deny, macOS remembers — but only for the stable identity. With ad-hoc signing,
the identity changes and macOS forgets. Explicit `requestMediaAccess()` from
the main process gives us a single, controllable prompt that we can check
before the renderer even loads.

**Files to change:**

#### `main.js` — add startup mic permission warm-up

Add after `sess.setPermissionRequestHandler(...)` in `app.whenReady()`:

```js
// ── macOS TCC warm-up: request microphone access once at startup ──────────
// This triggers the macOS TCC dialog (if not-determined) via the stable app
// identity, BEFORE the renderer loads. We check first to avoid re-prompting.
if (process.platform === 'darwin') {
  try {
    const { systemPreferences } = require('electron');
    // getMediaAccessStatus is non-prompting; it only reads TCC state.
    const status = await systemPreferences.getMediaAccessStatus('microphone');
    if (status === 'not-determined') {
      // One-shot explicit request — shows the TCC dialog now, not later.
      await systemPreferences.requestMediaAccess('microphone');
    }
  } catch (err) {
    // Non-critical: if this fails the renderer fallback (getUserMedia) still
    // works. Log but don't block startup.
    console.warn('[tcc] mic warm-up failed:', err?.message ?? err);
  }
}
```

#### `electron/ipc/mic.ipc.js` — add `request-mic-access` handler

Replace the current `check-mic-access` handler and add a new `request-mic-access`
handler that uses `systemPreferences` directly:

```js
import { createRequire } from 'module';
const { ipcMain, session, systemPreferences } = createRequire(import.meta.url)('electron');
import { exec } from 'child_process';

export function registerMicHandlers(mainWindow) {
  try { ipcMain.removeHandler('check-mic-access'); } catch { /* not registered yet */ }
  try { ipcMain.removeHandler('request-mic-access'); } catch { /* not registered yet */ }

  ipcMain.on('open-mic-settings', (e) => {
    if (process.platform === 'win32') {
      exec('start ms-settings:privacy-microphone', (err) => {
        e.reply('settings-opened', err ? { success: false } : { success: true });
      });
    } else if (process.platform === 'darwin') {
      exec('open x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone', (err) => {
        e.reply('settings-opened', err ? { success: false } : { success: true });
      });
    }
  });

  // Returns the current TCC state WITHOUT triggering a prompt.
  // Source of truth: systemPreferences.getMediaAccessStatus, not Chromium.
  ipcMain.handle('check-mic-access', async () => {
    try {
      if (process.platform === 'darwin') {
        const status = await systemPreferences.getMediaAccessStatus('microphone');
        return { accessible: status === 'granted', status };
      }
      // Non-macOS: fall back to Chromium session check
      const targetSession = mainWindow?.webContents?.session || session.defaultSession;
      const result = await targetSession.checkPermissionStatus('microphone');
      return { accessible: result === 'granted', status: result };
    } catch {
      return { accessible: false, status: 'unknown' };
    }
  });

  // Explicit one-shot request — shows the TCC dialog if not-determined.
  // Caller should check check-mic-access first to avoid unnecessary prompts.
  ipcMain.handle('request-mic-access', async () => {
    try {
      if (process.platform === 'darwin') {
        const result = await systemPreferences.requestMediaAccess('microphone');
        return { granted: result, status: result ? 'granted' : 'denied' };
      }
      // Non-macOS: getUserMedia is the only path; trigger a one-shot stream.
      try {
        const targetSession = mainWindow?.webContents?.session || session.defaultSession;
        // Auto-approved by setPermissionRequestHandler; just warm TCC.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        return { granted: true, status: 'granted' };
      } catch {
        return { granted: false, status: 'denied' };
      }
    } catch {
      return { granted: false, status: 'error' };
    }
  });

  ipcMain.on('clear-sensitive-data', (e) => {
    mainWindow?.webContents.executeJavaScript(
      `Object.keys(localStorage).filter(k=>/token|key|secret/i.test(k)).forEach(k=>localStorage.removeItem(k))`,
    ).catch(() => {});
    e.reply('data-cleared', { success: true });
  });
}
```

#### `preload.cjs` — expose the new `requestMicAccess` API

Add inside `contextBridge.exposeInMainWorld('electronAPI', { ... })`:

```js
// Mic — explicit permission request (avoids getUserMedia indirection)
requestMicAccess: () => ipcRenderer.invoke('request-mic-access'),
// Enhanced check that returns TCC status without prompting
checkMicAccess: () => ipcRenderer.invoke('check-mic-access'),
```

Remove the old inline definitions if they exist and use the invoke versions.

---

### Layer 3 — Renderer-side: check early, request explicitly, cache result

**Files to change:**

#### `src/services/speech/speech.service.ts` — replace mount-time warm-up

Replace the current `useEffect` at lines 118–139 with:

```ts
// ── Startup permission pre-grant ─────────────────────────────────────────
// Use the main-process TCC source of truth. On macOS, requestMediaAccess
// explicitly so the TCC dialog appears ONCE at startup (if not-determined),
// not later when the user presses Start. Cache the result in sessionStorage
// to avoid re-checking on every mount / HMR.
useEffect(() => {
  if (window.electronAPI?.platform !== 'darwin') return;

  (async () => {
    const cacheKey = 'aih.mic-permission-status';
    const cached = sessionStorage.getItem(cacheKey);
    if (cached === 'granted' || cached === 'denied') return; // already resolved

    try {
      const result = await window.electronAPI?.checkMicAccess?.();
      if (result?.status === 'not-determined') {
        // Explicit request — shows TCC dialog once, user choice is persisted
        // by macOS for the stable app identity.
        await window.electronAPI?.requestMicAccess?.();
      }
      // Re-read after request (user may have clicked Allow / Deny)
      const after = await window.electronAPI?.checkMicAccess?.();
      sessionStorage.setItem(cacheKey, after?.status ?? 'unknown');
    } catch {
      // best-effort; getUserMedia fallback in getMicDevices() still works
    }
  })();
}, []);
```

#### `src/services/speech/lib/audio-pipeline.ts` — use `systemPreferences` status

Update `getMicDevices()` to accept an optional pre-fetched status and avoid
the `enumerateDevices()` → empty-labels → `getUserMedia()` loop when TCC
already says `granted`:

```ts
export async function getMicDevices(
  preFetchedStatus?: { status: string }
): Promise<MicDevice[]> {
  // If we already know TCC status from the main process, use it.
  // This avoids a redundant getUserMedia() call that could re-trigger TCC
  // on unstable identities.
  const tccGranted = preFetchedStatus?.status === 'granted';

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    if (audioDevices.length > 0 && audioDevices.some(d => d.label)) {
      return audioDevices.map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
      }));
    }
    // If TCC says granted but labels are empty, something is off — don't
    // blindly call getUserMedia(); return what we have.
    if (tccGranted) {
      return audioDevices.map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
      }));
    }
  } catch {
    // fall through to request path below
  }

  // Permission not granted yet (or query failed); request it once.
  try {
    const permissionStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
      }
    });
    permissionStream.getTracks().forEach(t => t.stop());
  } catch (err) {
    console.warn('Failed to request microphone permission:', err);
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter(d => d.kind === 'audioinput')
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
}
```

Then in `speech.service.ts`, pass the cached status when loading devices:

```ts
const micStatus = await window.electronAPI?.checkMicAccess?.();
const devices = await getMicDevices(micStatus);
```

---

## Verification checklist

After applying all layers:

1. **Build** with stable identity:
   ```
   cd ai-interview-helper
   scripts/setup-signing-cert.sh   # one-time, no sudo
   npm run build && npm run electron-build
   ```
2. **Quarantine reset** (clears old ad-hoc TCC grants):
   ```
   tccutil reset Microphone com.javihai.app
   tccutil reset ScreenRecording com.javihai.app
   ```
3. **Launch** the built `.app`. You should see **one** TCC prompt at startup
   (not later when pressing Start). Click **Allow**.
4. **Quit and relaunch** — no prompt should appear.
5. **Reinstall** (delete app, reinstall DMG) — one prompt, then persistent.

If the prompt still appears on every launch, run:
```
codesign -dvv /Applications/JavihAI.app | grep Identifier
```
Expected: `Identifier=com.javihai.app` and `Authority=JavihAI Code Signing`.
If it shows `Identifier=Electron` → the stable cert wasn't used; check
`package.json` `build.mac.identity` and rerun `sign-mac.sh` manually.

---

## Why this is permanent

| Problem | Old behavior | New behavior |
|---|---|---|
| Unstable code identity | TCC grant forgotten every launch | Stable identity → TCC binds grant durably |
| `getUserMedia()` as permission warmer | Implicit, late, repeats on empty labels | Explicit `requestMediaAccess` at startup, one-shot |
| `enumerateDevices()` empty labels → fallback loop | Triggers `getUserMedia()` every mount | `systemPreferences` status is source of truth; skip fallback if already granted |
| No renderer-side caching | Re-checks on every mount/HMR | `sessionStorage` cache keyed by TCC status |
| `checkPermissionStatus` unreliable on macOS | Can throw/lie, falls through to getUserMedia | `systemPreferences.getMediaAccessStatus` is the authoritative, non-prompting source |

---

## Related files

| File | Role |
|---|---|
| `package.json` | `build.mac.identity` — must be set for stable signing |
| `build-assets/entitlements.mac.plist` | `com.apple.security.device.audio-input` — required |
| `build-assets/after-sign.cjs` | Re-signs if cert exists (safe no-op with stable identity) |
| `scripts/sign-mac.sh` | Manual re-sign for local testing |
| `scripts/setup-signing-cert.sh` | One-time cert creation (no sudo, no Apple account) |
| `main.js` | Startup TCC warm-up + permission handlers |
| `electron/ipc/mic.ipc.js` | `check-mic-access` + `request-mic-access` handlers |
| `preload.cjs` | Exposes `requestMicAccess` + `checkMicAccess` to renderer |
| `src/services/speech/speech.service.ts` | Startup permission pre-grant useEffect |
| `src/services/speech/lib/audio-pipeline.ts` | `getMicDevices()` — uses pre-fetched status |
| `electron/ipc/capture.ipc.js` | Screen Recording permission check (unchanged) |

---

## Do NOT

- Do not use `navigator.permissions.query({ name: 'microphone' })` as the
  source of truth — it is unreliable in Electron and can throw, causing the
  app to fall through to `getUserMedia()` and re-trigger TCC.
- Do not call `getUserMedia()` in a loop or on every mount to "warm" permissions.
- Do not leave `identity: null` in production Mac builds.
- Do not add `NSMicrophoneUsageDescription` without also fixing the identity —
  the description string only appears in the dialog; it doesn't affect persistence.
