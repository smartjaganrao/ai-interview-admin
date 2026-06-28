'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';
import BlogEditor from '@/components/BlogEditor';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  authorName: string;
  published: boolean;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
}

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const EMPTY_FORM = {
  title: '', slug: '', excerpt: '', contentHtml: '',
  coverImageUrl: '' as string | null, coverImageAlt: '',
  seoTitle: '', seoDescription: '', tagsInput: '', authorName: '', published: false,
};

export default function BlogAdminPage() {
  const { data: posts, loading, reason, refetch } = useAdminData<BlogPost[]>(
    '/api/blog', [],
    (json) => (json as { posts?: BlogPost[] }).posts || []
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [acting, setActing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const flash = (kind: 'ok' | 'err', text: string) => { setToast({ kind, text }); setTimeout(() => setToast(null), 3500); };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setSlugTouched(false); setShowForm(true); };
  const openEdit = (p: BlogPost) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, excerpt: p.excerpt, contentHtml: p.contentHtml,
      coverImageUrl: p.coverImageUrl, coverImageAlt: p.coverImageAlt,
      seoTitle: p.seoTitle, seoDescription: p.seoDescription,
      tagsInput: (p.tags || []).join(', '), authorName: p.authorName, published: p.published,
    });
    setSlugTouched(true);
    setShowForm(true);
  };

  const onTitleChange = (title: string) => {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  };

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/blog/upload-image', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (res.ok && data.url) setForm((f) => ({ ...f, coverImageUrl: data.url }));
      else flash('err', data.error || 'Cover image upload failed');
    } catch {
      flash('err', 'Cover image upload failed');
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.excerpt.trim() || !form.contentHtml.trim()) {
      flash('err', 'Title, slug, excerpt, and content are required');
      return;
    }
    setActing(true);
    const payload = {
      title: form.title, slug: form.slug, excerpt: form.excerpt, contentHtml: form.contentHtml,
      coverImageUrl: form.coverImageUrl, coverImageAlt: form.coverImageAlt,
      seoTitle: form.seoTitle, seoDescription: form.seoDescription,
      tags: form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      authorName: form.authorName, published: form.published,
    };
    const r = editing
      ? await (async () => {
          const res = await fetch(`/api/blog/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, error: data.error };
        })()
      : await postAdmin('/api/blog', payload);
    setActing(false);
    if (r.ok) { flash('ok', editing ? 'Post updated' : 'Post created'); setShowForm(false); refetch(); }
    else flash('err', r.error || 'Failed to save');
  };

  const remove = async (p: BlogPost) => {
    if (!window.confirm(`Delete post "${p.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/blog/${p.id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) { flash('ok', 'Deleted'); refetch(); }
    else flash('err', 'Failed to delete');
  };

  const togglePublished = async (p: BlogPost) => {
    const res = await fetch(`/api/blog/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ published: !p.published }) });
    if (res.ok) refetch();
  };

  return (
    <AdminShell title="Blog" subtitle="Write and publish posts shown on the landing page">
      {toast && (
        <div className={`admin-toast ${toast.kind === 'ok' ? 'admin-toast-ok' : 'admin-toast-err'}`}>
          {toast.kind === 'ok' ? '✓' : '⚠'} {toast.text}
        </div>
      )}
      {loading ? (
        <Loader label="Loading posts…" />
      ) : reason !== 'live' ? (
        <ErrorState reason={reason} onRetry={refetch} />
      ) : (
        <>
          <div className="filter-bar">
            <span className="text-sm text-muted">{posts.length} post{posts.length === 1 ? '' : 's'}</span>
            <div className="filter-bar-right">
              <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Post</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {posts.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="empty-state-text">No posts yet</div></div></div>
            ) : posts.map((p) => (
              <div key={p.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                    {p.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.coverImageUrl} alt={p.coverImageAlt} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--border)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="font-semibold">{p.title}</span>
                        <span className={`badge ${p.published ? 'badge-green' : 'badge-slate'}`}>{p.published ? 'published' : 'draft'}</span>
                      </div>
                      <div className="text-sm text-muted" style={{ marginBottom: 4 }}>/blog/{p.slug}</div>
                      <div className="text-sm text-muted">{p.excerpt}</div>
                      <div className="text-sm text-muted" style={{ marginTop: 4 }}>Updated {new Date(p.updatedAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => togglePublished(p)}>{p.published ? 'Unpublish' : 'Publish'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <div className="drawer-overlay" onClick={() => setShowForm(false)}>
          <div className="drawer" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">{editing ? 'Edit Post' : 'New Post'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Title</label>
            <input className="input mb-3" placeholder="How to Ace a System Design Interview" value={form.title} onChange={(e) => onTitleChange(e.target.value)} autoFocus />

            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Slug (URL)</label>
            <input className="input mb-3" placeholder="how-to-ace-a-system-design-interview" value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }} />

            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Excerpt</label>
            <textarea className="input mb-3" rows={2} style={{ resize: 'none' }} placeholder="Short summary shown on the blog list and used as the fallback meta description" value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />

            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Cover image</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {form.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.coverImageUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }}
                disabled={uploadingCover}
              />
              {uploadingCover && <span className="text-sm text-muted">Uploading…</span>}
            </div>
            <input className="input mb-3" placeholder="Cover image alt text" value={form.coverImageAlt} onChange={(e) => setForm((f) => ({ ...f, coverImageAlt: e.target.value }))} />

            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Content</label>
            <div className="mb-3">
              <BlogEditor html={form.contentHtml} onChange={(html) => setForm((f) => ({ ...f, contentHtml: html }))} />
            </div>

            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Tags (comma-separated)</label>
            <input className="input mb-3" placeholder="system design, interview tips" value={form.tagsInput} onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))} />

            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Author</label>
            <input className="input mb-3" placeholder="JavihAI Team" value={form.authorName} onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))} />

            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="text-sm font-semibold mb-2">SEO overrides (optional)</div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>SEO title</label>
            <input className="input mb-3" placeholder="Falls back to the title above" value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} />
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>SEO description</label>
            <textarea className="input mb-3" rows={2} style={{ resize: 'none' }} placeholder="Falls back to the excerpt above" value={form.seoDescription} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13 }}>
              <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />
              Published — visible on the landing page
            </label>

            <button className="btn btn-primary w-full" disabled={acting || !form.title.trim() || !form.slug.trim() || !form.excerpt.trim() || !form.contentHtml.trim()} onClick={save}>
              {acting ? 'Saving…' : editing ? 'Save Changes' : 'Create Post'}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
