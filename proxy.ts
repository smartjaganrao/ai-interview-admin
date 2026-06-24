import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin-session';
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/health'];

// Dev-only auth bypass: lets localhost skip the Google login wall. Guarded on
// NODE_ENV so a production build can never enable it even if the flag leaks.
const DEV_NO_AUTH =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_ADMIN_DEV_NO_AUTH === 'true';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (DEV_NO_AUTH) {
    return NextResponse.next();
  }

  // Skip for Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo')
  ) {
    return NextResponse.next();
  }

  // Allow public API paths (but not /login page — that's handled below)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
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

  // Already on login page — let them stay there
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to login
  if (!isAdmin) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  // Every admin API response reflects live Firestore reads — never let the
  // browser or an intermediary cache serve a stale one after an add/delete.
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
