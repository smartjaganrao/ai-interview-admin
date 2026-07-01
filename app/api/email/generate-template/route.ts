import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

const BACKEND_API = 'https://javihai.in/api/email/generate-template';

/**
 * POST { type, customPrompt? }
 * Proxies template generation to the shared backend (landing app), which
 * holds the Groq API key. Mirrors the pattern used by /api/promotions/send.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { type, customPrompt } = await request.json();
  if (!type) {
    return NextResponse.json({ error: 'Template type is required' }, { status: 400 });
  }

  try {
    const response = await fetch(BACKEND_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, customPrompt }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || `Template generation failed (HTTP ${response.status})` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reach template service';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
