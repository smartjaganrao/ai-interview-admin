/**
 * One-command setup for REAL admin data on production.
 *
 * Reads FIREBASE_ADMIN_SDK_JSON from .env.local and pushes it to the Vercel
 * production environment, then redeploys. After this runs (and you're signed
 * in), the admin pages read REAL Firestore data instead of the demo fallback.
 *
 * Why a script? The value is a multi-KB JSON blob — pasting it into a shell
 * one-liner breaks on Windows quoting. This handles it robustly via stdin.
 *
 * Usage:
 *   cd "D:\Jagan\Projects\AI Tutor\ai-interview-admin"
 *   node scripts/push-admin-secret.mjs
 *
 * Requires: Vercel CLI installed and logged in (you already are — deploys work).
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

// 1) Extract the service-account JSON value from .env.local
let raw;
try {
  raw = readFileSync(envPath, 'utf8');
} catch {
  console.error(`❌ Could not read ${envPath}`);
  process.exit(1);
}
const m = raw.match(/^FIREBASE_ADMIN_SDK_JSON=(.*)$/m);
if (!m) {
  console.error('❌ FIREBASE_ADMIN_SDK_JSON not found in .env.local');
  process.exit(1);
}
let value = m[1].trim();
if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
  value = value.slice(1, -1);
}
try {
  JSON.parse(value);
} catch (e) {
  console.error('❌ FIREBASE_ADMIN_SDK_JSON is not valid JSON:', e.message);
  process.exit(1);
}

const vercel = process.platform === 'win32' ? 'vercel.cmd' : 'vercel';
const run = (args, opts = {}) =>
  spawnSync(vercel, args, { stdio: ['pipe', 'inherit', 'inherit'], shell: true, ...opts });

console.log('→ Removing any existing FIREBASE_ADMIN_SDK_JSON (production)…');
run(['env', 'rm', 'FIREBASE_ADMIN_SDK_JSON', 'production', '-y'], { input: '' });

console.log('→ Adding FIREBASE_ADMIN_SDK_JSON to production…');
const add = run(['env', 'add', 'FIREBASE_ADMIN_SDK_JSON', 'production'], { input: value });
if (add.status !== 0) {
  console.error('❌ Failed to add the env var. Is the Vercel CLI logged in? Try: vercel login');
  process.exit(add.status ?? 1);
}

console.log('→ Redeploying production so the new secret takes effect…');
const dep = run(['deploy', '--prod']);
if (dep.status !== 0) {
  console.error('❌ Redeploy failed — run `vercel deploy --prod` manually.');
  process.exit(dep.status ?? 1);
}

console.log('\n✅ Done. FIREBASE_ADMIN_SDK_JSON is set on production and the app redeployed.');
console.log('   Sign in at https://ai-interview-admin-woad.vercel.app/login —');
console.log('   the pages will now show REAL Firestore data (the "Demo" badge turns to "Live").');
