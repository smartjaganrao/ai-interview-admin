import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase is initialized
    if (!db) {
      return NextResponse.json(
        { error: 'Firebase not configured. Add FIREBASE_ADMIN_SDK_JSON to .env.local' },
        { status: 500 }
      );
    }

    const collectionsToCreate = [
      'users',
      'subscriptions',
      'admin_logs',
      'interview_sessions',
      'interview_messages',
      'support_tickets',
      'usage_tracking',
    ];

    const results = [];

    for (const collectionName of collectionsToCreate) {
      try {
        // Check if collection exists by trying to get docs
        const snapshot = await db.collection(collectionName).limit(1).get();

        if (snapshot.empty) {
          // Collection is empty, create it with a placeholder document
          await db.collection(collectionName).doc('_placeholder').set({
            _created: new Date().toISOString(),
            _description: `${collectionName} collection`,
          });

          // Delete the placeholder document
          await db.collection(collectionName).doc('_placeholder').delete();

          results.push({
            collection: collectionName,
            status: 'created',
            message: `Collection "${collectionName}" created`,
          });
        } else {
          results.push({
            collection: collectionName,
            status: 'exists',
            message: `Collection "${collectionName}" already exists`,
          });
        }
      } catch (error: any) {
        results.push({
          collection: collectionName,
          status: 'error',
          message: error.message,
        });
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Firestore collections initialization complete',
      results,
    });
  } catch (error: any) {
    console.error('[Setup] Error initializing collections:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize collections',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
