import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { isAdminRequest, getSession } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/** PATCH — update a blog post. Re-checks slug uniqueness if slug changes;
 *  stamps publishedAt the first time `published` flips to true. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();
  const { id } = await params;

  const patch = await request.json();
  const docRef = db.collection('blog_posts').doc(id);
  const existingDoc = await docRef.get();
  if (!existingDoc.exists) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  const existing = existingDoc.data()!;

  const update: Record<string, unknown> = { updatedAt: Date.now() };

  if (typeof patch.title === 'string') update.title = patch.title.trim();
  if (typeof patch.excerpt === 'string') update.excerpt = patch.excerpt.trim();
  if (typeof patch.contentHtml === 'string') update.contentHtml = patch.contentHtml;
  if ('coverImageUrl' in patch) update.coverImageUrl = patch.coverImageUrl || null;
  if (typeof patch.coverImageAlt === 'string') update.coverImageAlt = patch.coverImageAlt.trim();
  if (typeof patch.seoTitle === 'string') update.seoTitle = patch.seoTitle.trim();
  if (typeof patch.seoDescription === 'string') update.seoDescription = patch.seoDescription.trim();
  if (Array.isArray(patch.tags)) update.tags = patch.tags.filter(Boolean);
  if (typeof patch.authorName === 'string') update.authorName = patch.authorName.trim() || 'JavihAI Team';

  if (typeof patch.slug === 'string') {
    const cleanSlug = patch.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleanSlug)) {
      return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 });
    }
    if (cleanSlug !== existing.slug) {
      const dupe = await db.collection('blog_posts').where('slug', '==', cleanSlug).limit(1).get();
      if (!dupe.empty) {
        return NextResponse.json({ error: `Slug "${cleanSlug}" is already in use` }, { status: 409 });
      }
    }
    update.slug = cleanSlug;
  }

  if (typeof patch.published === 'boolean') {
    update.published = patch.published;
    if (patch.published && !existing.publishedAt) {
      update.publishedAt = Date.now();
    }
  }

  await docRef.update(update);

  await db.collection('admin_logs').add({
    adminUid: session?.uid || 'system', adminEmail: session?.email || 'system',
    action: 'blog_post_update', targetId: id, details: update, timestamp: Date.now(),
  });

  return NextResponse.json({ ok: true });
}

/** DELETE — remove a blog post. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  const session = await getSession();
  const { id } = await params;

  await db.collection('blog_posts').doc(id).delete();

  await db.collection('admin_logs').add({
    adminUid: session?.uid || 'system', adminEmail: session?.email || 'system',
    action: 'blog_post_delete', targetId: id, timestamp: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
