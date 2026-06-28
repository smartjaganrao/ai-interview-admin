import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { storage } from '@/lib/firebase-admin';
import { isAdminRequest } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — stays under typical serverless body limits

/** POST multipart/form-data { file } — uploads a cover/inline image for a blog
 *  post to Firebase Storage and returns its public URL. Used both by the
 *  cover-image field and the editor's "Insert Image" button. */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!storage) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 4MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `blog/${randomUUID()}.${ext}`;
  const bucketFile = storage.bucket().file(path);

  await bucketFile.save(buffer, { contentType: file.type, public: true });
  const url = `https://storage.googleapis.com/${storage.bucket().name}/${path}`;

  return NextResponse.json({ ok: true, url });
}
