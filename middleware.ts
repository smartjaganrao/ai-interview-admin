import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface Session {
  uid: string;
  email: string;
  role: 'super-admin' | 'admin' | 'moderator' | 'analyst';
  isAdmin: boolean;
}

async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin-session');

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const session = await getSession();

  // Allow login page without session
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next();
  }

  // Allow health check
  if (request.nextUrl.pathname === '/api/health') {
    return NextResponse.next();
  }

  // Allow auth API routes
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Redirect to login if no session
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
