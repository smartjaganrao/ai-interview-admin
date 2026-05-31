'use client';

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Public client config for project `ai-interview-tutor` — shared with the
// landing page and desktop app so all three stay in sync. These NEXT_PUBLIC_*
// keys are public by design; real security comes from Firestore rules +
// the admin custom-claim check on the server. Hardcoded fallbacks guarantee
// the deployed admin connects even if Vercel env vars aren't set.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBm_MFHfjHS7nL5fHYP9BiMMntgiiNi8pE',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'ai-interview-tutor.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ai-interview-tutor',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ai-interview-tutor.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '475876914174',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:475876914174:web:caceda87b97359476546af',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Set custom parameters for Google Sign-In
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export async function loginWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const idToken = await userCredential.user.getIdToken();

  // Send token to backend to verify admin claim
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error('Admin verification failed. Only admins can access this panel. Contact your super admin.');
  }

  return response.json();
}

export async function loginWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await userCredential.user.getIdToken();

  // Send token to backend to verify admin claim
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error('Admin verification failed. Are you an admin?');
  }

  return response.json();
}

export async function logout() {
  await signOut(auth);
  // Clear session cookie
  await fetch('/api/auth/logout', { method: 'POST' });
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
