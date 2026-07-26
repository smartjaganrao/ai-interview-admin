import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session-server';

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    const message = error instanceof Error ? error.message : 'Logout failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
