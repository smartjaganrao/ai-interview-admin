import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getCached } from '@/lib/route-cache';

export async function GET() {
  if (!db) {
    return NextResponse.json(
      { status: 'error', message: 'Firebase Admin SDK not initialized' },
      { status: 500 }
    );
  }

  const firestore = db;
  return getCached('health:check', 30 * 1000, async () => {
    try {
      const docRef = firestore.collection('_health').doc('check');
      await docRef.get();

      return NextResponse.json(
        { status: 'ok', message: 'Firebase connected' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Health check error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { status: 'error', message },
        { status: 500 }
      );
    }
  });
}
