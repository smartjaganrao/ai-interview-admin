import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin-session';
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/api/health'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  let isAdmin = false;
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value);
      isAdmin = session?.isAdmin === true;
    } catch {
      // malformed cookie — treat as unauthenticated
    }
  }

  // Dev-only bypass — lets local dev skip the admin-claim login dance.
  // Double-gated: NODE_ENV must not be 'production' AND the flag must be explicit.
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ADMIN_DEV_NO_AUTH === 'true'
  ) {
    return NextResponse.next();
  }

  if (!isAdmin) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
