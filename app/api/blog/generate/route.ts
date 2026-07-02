import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

const BACKEND_API = 'https://javihai.in/api/blog/generate';

/**
 * POST { idea, tone?, length? }
 * Proxies blog-post generation to the shared backend (landing app), which
 * holds the Groq API key. Mirrors the pattern used by /api/email/generate-template.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { idea, tone, length } = await request.json();
  if (!idea || typeof idea !== 'string' || !idea.trim()) {
    return NextResponse.json({ error: 'A blog idea/prompt is required' }, { status: 400 });
  }

  try {
    const response = await fetch(BACKEND_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, tone, length }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || `Blog generation failed (HTTP ${response.status})` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reach blog generation service';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
