'use server';

import { cookies } from 'next/headers';
import { Session } from './session';

const SESSION_COOKIE_NAME = 'admin-session';

// Dev-only auth bypass — mirrors proxy.ts. Guarded on NODE_ENV so it can never
// activate in a production build. When on, the panel treats every request as a
// synthetic local admin.
const DEV_NO_AUTH =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_ADMIN_DEV_NO_AUTH === 'true';

const DEV_SESSION: Session = {
  uid: 'dev-admin',
  email: process.env.NEXT_PUBLIC_ADMIN_DEV_EMAIL || 'smartjaganrao@gmail.com',
  role: 'super-admin',
  isAdmin: true,
};

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
  if (DEV_NO_AUTH) {
    return DEV_SESSION;
  }
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
 * Authorization gate for admin data routes. A real admin session
 * (custom-claim) is always required — local dev and production both hit
 * the same database, so there is no auth bypass for either.
 */
export async function isAdminRequest(): Promise<boolean> {
  const session = await getSession();
  return !!session?.isAdmin;
}
