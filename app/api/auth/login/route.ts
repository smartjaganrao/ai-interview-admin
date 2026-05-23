import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth } from '@/lib/firebase-admin';
import { createSession } from '@/lib/session-server';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token required' },
        { status: 400 }
      );
    }

    // Check if Firebase is configured
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not configured. Please add FIREBASE_ADMIN_SDK_JSON to .env.local' },
        { status: 500 }
      );
    }

    // Verify token and get claims
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Check if user has admin claim
    if (!decodedToken.admin) {
      return NextResponse.json(
        { error: 'You do not have admin access' },
        { status: 403 }
      );
    }

    // Create session
    const session = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: (decodedToken.role as 'super-admin' | 'admin' | 'moderator' | 'analyst') || 'admin',
      isAdmin: true,
    };

    await createSession(session);

    return NextResponse.json(
      { success: true, user: session },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
