import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) envVars[match[1]] = match[2];
}

let serviceAccountKey = null;
try {
  serviceAccountKey = JSON.parse(envVars.FIREBASE_ADMIN_SDK_JSON);
} catch (e) {
  console.error('Failed to parse service account:', e);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
    projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function backfillMissingUsers() {
  console.log('Fetching all Firebase Auth users...');
  const authUsers = [];
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    authUsers.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);
  
  console.log(`Total Firebase Auth users: ${authUsers.length}`);

  console.log('Fetching all Firestore user documents...');
  const firestoreSnap = await db.collection('users').get();
  const firestoreUids = new Set(firestoreSnap.docs.map(d => d.id));
  console.log(`Total Firestore user docs: ${firestoreSnap.size}`);

  const missing = authUsers.filter(u => !firestoreUids.has(u.uid));
  console.log(`Missing from Firestore: ${missing.length} users`);

  if (missing.length === 0) {
    console.log('No missing users. Done.');
    return;
  }

  let created = 0;
  let failed = 0;

  for (const fbUser of missing) {
    try {
      const userData = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || '',
        plan: 'free',
        status: 'active',
        createdAt: Number(fbUser.metadata.creationTime) || Date.now(),
        updatedAt: Date.now(),
        adminGranted: false,
        countTowardRevenue: true,
      };

      await db.collection('users').doc(fbUser.uid).set(userData);
      console.log(`Created Firestore doc for ${fbUser.uid}: ${fbUser.email} / ${fbUser.displayName}`);
      created++;
    } catch (e) {
      console.error(`Failed to create doc for ${fbUser.uid}:`, e);
      failed++;
    }
  }

  console.log(`\nDone. Created: ${created}, Failed: ${failed}`);
}

backfillMissingUsers().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
