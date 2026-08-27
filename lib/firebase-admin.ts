import * as admin from 'firebase-admin';

let serviceAccountKey = null;

function normalizeServiceAccountJson(raw: string): any {
  // First attempt: standard parse.
  try {
    return JSON.parse(raw);
  } catch {
    // Fallback: env-var packaging often corrupts multi-line PEM keys.
    // Try to sanitize only the private_key value and re-parse.
    try {
      const sanitized = raw.replace(/("private_key"\s*:\s*")([\s\S]*?)(")/, (match, start, key, end) => {
        const normalized = key.replace(/\n/g, '\\n').replace(/\r/g, '');
        return `${start}${normalized}${end}`;
      });
      const parsed = JSON.parse(sanitized);
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

try {
  const jsonString = process.env.FIREBASE_ADMIN_SDK_JSON;
  if (jsonString) {
    serviceAccountKey = normalizeServiceAccountJson(jsonString);
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
