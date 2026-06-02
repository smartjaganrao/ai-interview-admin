/**
 * One-time admin bootstrap.
 *
 * Grants the `admin: true` + `role: super-admin` custom claim to a Firebase
 * user, using the service-account credentials already in .env.local.
 *
 * The claim lives on the Firebase user (project-wide), so running this once
 * locally makes the account an admin everywhere — including the deployed
 * production admin panel. No production secret or endpoint required for this step.
 *
 * Usage:
 *   node scripts/grant-admin.mjs                       # grants to smartjaganrao@gmail.com
 *   node scripts/grant-admin.mjs you@example.com       # grants to a specific email
 *
 * After running: sign OUT and sign back IN on the admin panel — custom claims
 * only attach to a freshly-issued ID token.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

let raw;
try {
  raw = readFileSync(envPath, 'utf8');
} catch {
  console.error(`❌ Could not read ${envPath}`);
  process.exit(1);
}

// Extract FIREBASE_ADMIN_SDK_JSON (value may be quoted and span the rest of the line)
const match = raw.match(/^FIREBASE_ADMIN_SDK_JSON=(.*)$/m);
if (!match) {
  console.error('❌ FIREBASE_ADMIN_SDK_JSON not found in .env.local');
  process.exit(1);
}
let value = match[1].trim();
if (
  (value.startsWith('"') && value.endsWith('"')) ||
  (value.startsWith("'") && value.endsWith("'"))
) {
  value = value.slice(1, -1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(value);
} catch (e) {
  console.error('❌ FIREBASE_ADMIN_SDK_JSON is not valid JSON:', e.message);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const email = process.argv[2] || 'smartjaganrao@gmail.com';

try {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true, role: 'super-admin' });
  console.log(`✅ Granted super-admin to ${email}`);
  console.log(`   uid: ${user.uid}`);
  console.log('\n👉 Now sign OUT and sign back IN at https://ai-interview-admin-woad.vercel.app');
  process.exit(0);
} catch (e) {
  if (e.code === 'auth/user-not-found') {
    console.error(`❌ No Firebase account exists for ${email}.`);
    console.error('   Sign in once on the admin panel first (it will fail with "Admin verification failed",');
    console.error('   but that creates the account), then re-run this script.');
  } else {
    console.error('❌ Failed:', e.message);
  }
  process.exit(1);
}
