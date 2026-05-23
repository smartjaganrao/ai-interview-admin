import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin SDK is initialized
    if (!auth) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not configured. Add FIREBASE_ADMIN_SDK_JSON to .env.local' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, role = 'super-admin' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required in request body' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await auth.getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: `User with email "${email}" not found in Firebase` },
        { status: 404 }
      );
    }

    // Set custom claims
    const customClaims = {
      admin: true,
      role: role,
    };

    await auth.setCustomUserClaims(user.uid, customClaims);

    return NextResponse.json({
      status: 'success',
      message: `Custom claims set for user: ${email}`,
      user: {
        uid: user.uid,
        email: user.email,
        customClaims: customClaims,
      },
    });
  } catch (error: any) {
    console.error('[Setup] Error setting custom claims:', error);

    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'The email address does not exist in Firebase Authentication',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to set custom claims',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
