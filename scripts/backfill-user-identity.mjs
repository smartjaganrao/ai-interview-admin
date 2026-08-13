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

async function backfill() {
  console.log('Fetching all users from Firestore...');
  const usersSnap = await db.collection('users').get();
  console.log(`Total users: ${usersSnap.size}`);

  const missingIdentity = [];
  const missingCreatedAtList = [];
  
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const missingEmail = !data.email;
    const missingName = !data.name;
    const missingCreatedAt = !data.createdAt;
    
    if (missingEmail || missingName) {
      missingIdentity.push({ uid: doc.id, email: data.email || null, name: data.name || null });
    }
    if (missingCreatedAt) {
      missingCreatedAtList.push({ 
        uid: doc.id, 
        createTime: doc.createTime.toMillis(),
        email: data.email,
        name: data.name
      });
    }
  }

  console.log(`Users missing email/name: ${missingIdentity.length}`);
  console.log(`Users missing createdAt: ${missingCreatedAtList.length}`);

  let fixed = 0;
  let failed = 0;

  // Fix email/name
  for (const user of missingIdentity) {
    try {
      const fbUser = await auth.getUser(user.uid);
      const updates = {};
      if (!user.email && fbUser.email) updates.email = fbUser.email;
      if (!user.name && fbUser.displayName) updates.name = fbUser.displayName;

      if (Object.keys(updates).length > 0) {
        await db.collection('users').doc(user.uid).set(updates, { merge: true });
        console.log(`Fixed identity ${user.uid}: ${fbUser.email} / ${fbUser.displayName}`);
        fixed++;
      } else {
        console.log(`No Auth data for ${user.uid}: email=${fbUser.email}, displayName=${fbUser.displayName}`);
        failed++;
      }
    } catch (e) {
      console.error(`Failed to backfill identity ${user.uid}:`, e);
      failed++;
    }
  }

  // Fix createdAt
  for (const user of missingCreatedAtList) {
    try {
      const updates = { createdAt: user.createTime };
      // If email/name are also missing, backfill from Auth
      if (!user.email || !user.name) {
        const fbUser = await auth.getUser(user.uid);
        if (!user.email && fbUser.email) updates.email = fbUser.email;
        if (!user.name && fbUser.displayName) updates.name = fbUser.displayName;
      }
      await db.collection('users').doc(user.uid).set(updates, { merge: true });
      console.log(`Fixed createdAt ${user.uid}: ${user.createTime}`);
      fixed++;
    } catch (e) {
      console.error(`Failed to backfill createdAt ${user.uid}:`, e);
      failed++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Failed/Skipped: ${failed}`);
}

backfill().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
