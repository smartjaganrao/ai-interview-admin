import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

interface BlogPostInput {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl?: string | null;
  coverImageAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  authorName?: string;
  published?: boolean;
}

/** GET — list all blog posts (drafts included) for the admin panel, newest first. */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const snap = await db.collection('blog_posts').orderBy('updatedAt', 'desc').limit(200).get();
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ posts });
}

/** POST — create a new blog post. Rejects duplicate slugs. */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();

  const body = await request.json() as BlogPostInput;
  const { title, slug, excerpt, contentHtml } = body;
  if (!title?.trim() || !slug?.trim() || !excerpt?.trim() || !contentHtml?.trim()) {
    return NextResponse.json({ error: 'Title, slug, excerpt, and content are required' }, { status: 400 });
  }
  const cleanSlug = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleanSlug)) {
    return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 });
  }

  const existing = await db.collection('blog_posts').where('slug', '==', cleanSlug).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ error: `Slug "${cleanSlug}" is already in use` }, { status: 409 });
  }

  const now = Date.now();
  const published = body.published === true;
  const ref = await db.collection('blog_posts').add({
    title: title.trim(),
    slug: cleanSlug,
    excerpt: excerpt.trim(),
    contentHtml,
    coverImageUrl: body.coverImageUrl || null,
    coverImageAlt: body.coverImageAlt?.trim() || '',
    seoTitle: body.seoTitle?.trim() || '',
    seoDescription: body.seoDescription?.trim() || '',
    tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
    authorName: body.authorName?.trim() || 'JavihAI Team',
    published,
    createdAt: now,
    updatedAt: now,
    publishedAt: published ? now : null,
  });

  await db.collection('admin_logs').add({
    adminUid: session?.uid || 'system', adminEmail: session?.email || 'system',
    action: 'blog_post_create', targetId: ref.id, details: { title: title.trim(), slug: cleanSlug }, timestamp: now,
  });

  return NextResponse.json({ ok: true, id: ref.id });
}
