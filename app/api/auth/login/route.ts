import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { createSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/**
 * Verifies a Firebase ID token WITHOUT the Admin SDK.
 *
 * Firebase ID tokens are RS256 JWTs signed by Google's secure-token service,
 * and custom claims (admin, role) are embedded in the payload. We can verify
 * them against Google's PUBLIC keys — no FIREBASE_ADMIN_SDK_JSON service-account
 * secret required. This is the same cryptographic check the Admin SDK performs:
 *   - signature valid against Google's published JWKS
 *   - iss === https://securetoken.google.com/<projectId>
 *   - aud === <projectId>
 *   - not expired
 * Then we gate on the `admin` custom claim.
 */
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ai-interview-tutor';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'ID token required' }, { status: 400 });
    }

    // Dev bypass: skip admin-claim check so local dev works without granting claims
    // in the dev Firebase project. Double-gated — never active in production.
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.NEXT_PUBLIC_ADMIN_DEV_NO_AUTH === 'true'
    ) {
      const devSession = { uid: 'dev', email: 'dev@local', role: 'super-admin' as const, isAdmin: true };
      await createSession(devSession);
      return NextResponse.json({ success: true, user: devSession }, { status: 200 });
    }

    let payload;
    try {
      const result = await jwtVerify(idToken, JWKS, {
        issuer: `https://securetoken.google.com/${PROJECT_ID}`,
        audience: PROJECT_ID,
      });
      payload = result.payload as Record<string, unknown>;
    } catch (err) {
      console.error('[auth/login] token verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid or expired sign-in token. Please try again.' },
        { status: 401 }
      );
    }

    // Gate on the admin custom claim (embedded in the verified token)
    if (payload.admin !== true) {
      return NextResponse.json(
        { error: 'You do not have admin access' },
        { status: 403 }
      );
    }

    const role = (payload.role as 'super-admin' | 'admin' | 'moderator' | 'analyst') || 'admin';
    const session = {
      uid: (payload.user_id as string) || (payload.sub as string) || '',
      email: (payload.email as string) || '',
      role,
      isAdmin: true,
    };

    await createSession(session);

    return NextResponse.json({ success: true, user: session }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    console.error('[auth/login] error:', message);
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
