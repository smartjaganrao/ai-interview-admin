import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/lib/session-server';

export async function POST(request: NextRequest) {
  try {
    await clearSession();
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
