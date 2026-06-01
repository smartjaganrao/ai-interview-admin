'use server';

import { cookies } from 'next/headers';
import { Session } from './session';

const SESSION_COOKIE_NAME = 'admin-session';

export async function createSession(session: Session) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Authorization gate for admin data routes.
 *
 * Returns true when the request is from an authenticated admin (custom-claim
 * session), OR — for LOCAL DEVELOPMENT ONLY — when the explicit
 * ADMIN_DEV_NO_AUTH flag is set in a non-production build. This lets a
 * developer view real Firestore data locally without the production
 * admin-claim login dance.
 *
 * Double-gated for safety:
 *   1. NODE_ENV must NOT be 'production' (Vercel sets this automatically)
 *   2. ADMIN_DEV_NO_AUTH must be explicitly 'true' (off by default)
 * In production both guards fail, so a real admin session is always required.
 */
export async function isAdminRequest(): Promise<boolean> {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ADMIN_DEV_NO_AUTH === 'true'
  ) {
    return true;
  }
  const session = await getSession();
  return !!session?.isAdmin;
}
