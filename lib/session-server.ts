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
 * Authorization gate for admin data routes. A real admin session
 * (custom-claim) is always required — local dev and production both hit
 * the same database, so there is no auth bypass for either.
 */
export async function isAdminRequest(): Promise<boolean> {
  const session = await getSession();
  return !!session?.isAdmin;
}
