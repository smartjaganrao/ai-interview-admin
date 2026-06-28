import * as admin from 'firebase-admin';

let serviceAccountKey = null;

try {
  const jsonString = process.env.FIREBASE_ADMIN_SDK_JSON;
  if (jsonString) {
    serviceAccountKey = JSON.parse(jsonString);
  }
} catch (error) {
  console.warn('[Firebase] Failed to parse service account JSON:', error);
  serviceAccountKey = null;
}

// Only initialize if we have valid credentials
if (!admin.apps.length && serviceAccountKey && serviceAccountKey.private_key) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.warn('[Firebase] Failed to initialize admin SDK:', error);
  }
}

// Export null-safe references
export const db = admin.apps.length > 0 ? admin.firestore() : null;
export const auth = admin.apps.length > 0 ? admin.auth() : null;
export const storage = admin.apps.length > 0 ? admin.storage() : null;

export default admin;
