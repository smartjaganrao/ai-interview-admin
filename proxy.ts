import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin-session';
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/health'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
