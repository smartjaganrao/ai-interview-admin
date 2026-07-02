'use client';

import { useEffect, useRef, useState } from 'react';
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

const SITE_URL = 'javihai.in';
const EXCERPT_LIMIT = 160;
const SEO_TITLE_LIMIT = 60;
const SEO_DESC_LIMIT = 160;
const WORDS_PER_MINUTE = 200;

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

const EMPTY_FORM = {
  title: '', slug: '', excerpt: '', contentHtml: '',
  coverImageUrl: '' as string | null, coverImageAlt: '',
  seoTitle: '', seoDescription: '', tags: [] as string[], authorName: '', published: false,
};

function Counter({ value, limit }: { value: number; limit: number }) {
  return <span className={`blog-editor-counter ${value > limit ? 'over' : ''}`}>{value}/{limit}</span>;
}

export default function BlogAdminPage() {
  const { data: posts, loading, reason, refetch } = useAdminData<BlogPost[]>(
    '/api/blog', [],
    (json) => (json as { posts?: BlogPost[] }).posts || []
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [acting, setActing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [genIdea, setGenIdea] = useState('');
  const [genTone, setGenTone] = useState('conversational but sharp');
  const [genLength, setGenLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [generating, setGenerating] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const flash = (kind: 'ok' | 'err', text: string) => { setToast({ kind, text }); setTimeout(() => setToast(null), 3500); };

  // Focusing the title input on open used to use the `autoFocus` attribute,
  // which makes Safari (and sometimes Chrome) scroll-into-view more
  // aggressively than needed — the editor would open already scrolled a
  // section or two down, with the title field clipped above the fold.
  // Safari also doesn't reliably honor `focus({ preventScroll: true })` on
  // elements inside a nested scroll container (a long-standing WebKit
  // quirk) — it scrolls anyway, right after we reset scrollTop. Re-asserting
  // scrollTop on the next two frames overrides that late scroll.
  useEffect(() => {
    if (!showForm) return;
    const resetScroll = () => { if (scrollRef.current) scrollRef.current.scrollTop = 0; };
    resetScroll();
    titleInputRef.current?.focus({ preventScroll: true });
    const raf1 = requestAnimationFrame(() => {
      resetScroll();
      const raf2 = requestAnimationFrame(resetScroll);
      rafRef.current = raf2;
    });
    rafRef.current = raf1;
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [showForm]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setSlugTouched(false); setEditingSlug(false); setTagInput(''); setShowForm(true); };
  const openEdit = (p: BlogPost) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, excerpt: p.excerpt, contentHtml: p.contentHtml,
      coverImageUrl: p.coverImageUrl, coverImageAlt: p.coverImageAlt,
      seoTitle: p.seoTitle, seoDescription: p.seoDescription,
      tags: p.tags || [], authorName: p.authorName, published: p.published,
    });
    setSlugTouched(true);
    setEditingSlug(false);
    setTagInput('');
    setShowForm(true);
  };

  const onTitleChange = (title: string) => {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  };

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    setForm((f) => (f.tags.includes(tag) ? f : { ...f, tags: [...f.tags, tag] }));
    setTagInput('');
  };
  const removeTag = (tag: string) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    else if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1]);
    }
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

  const onCoverDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadCover(file);
  };

  const save = async (publish?: boolean) => {
    if (!form.title.trim() || !form.slug.trim() || !form.excerpt.trim() || !form.contentHtml.trim()) {
      flash('err', 'Title, slug, excerpt, and content are required');
      return;
    }
    setActing(true);
    const published = publish ?? form.published;
    const payload = {
      title: form.title, slug: form.slug, excerpt: form.excerpt, contentHtml: form.contentHtml,
      coverImageUrl: form.coverImageUrl, coverImageAlt: form.coverImageAlt,
      seoTitle: form.seoTitle, seoDescription: form.seoDescription,
      tags: form.tags, authorName: form.authorName, published,
    };
    const r = editing
      ? await (async () => {
          const res = await fetch(`/api/blog/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
          const data = await res.json().catch(() => ({}));
          return { ok: res.ok, error: data.error };
        })()
      : await postAdmin('/api/blog', payload);
    setActing(false);
    if (r.ok) { flash('ok', published ? 'Post published' : 'Draft saved'); setShowForm(false); refetch(); }
    else flash('err', r.error || 'Failed to save');
  };

  const remove = async (p: BlogPost) => {
    if (!window.confirm(`Delete post "${p.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/blog/${p.id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) { flash('ok', 'Deleted'); refetch(); }
    else flash('err', 'Failed to delete');
  };

  const generateWithAI = async () => {
    if (!genIdea.trim()) { flash('err', 'Enter a blog idea first'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idea: genIdea, tone: genTone, length: genLength }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.post) {
        const p = data.post;
        setForm((f) => ({
          ...f,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          contentHtml: p.contentHtml,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          tags: p.tags || [],
        }));
        setSlugTouched(true);
        flash('ok', 'Draft generated — review before publishing');
      } else {
        flash('err', data.error || 'Generation failed');
      }
    } catch {
      flash('err', 'Generation failed — could not reach the generator');
    } finally {
      setGenerating(false);
    }
  };

  const togglePublished = async (p: BlogPost) => {
    const res = await fetch(`/api/blog/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ published: !p.published }) });
    if (res.ok) refetch();
  };

  const canSave = !!form.title.trim() && !!form.slug.trim() && !!form.excerpt.trim() && !!form.contentHtml.trim();
  const words = wordCount(form.contentHtml);
  const readMins = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

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
        <div className="blog-editor-overlay">
          <div className="blog-editor-topbar">
            <div className="blog-editor-topbar-title">
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)} title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <span>{editing ? 'Edit Post' : 'New Post'}</span>
              {editing && <span className={`badge ${editing.published ? 'badge-green' : 'badge-slate'}`}>{form.published ? 'published' : 'draft'}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-secondary btn-sm" disabled={acting || !canSave} onClick={() => save(false)}>
                {acting ? 'Saving…' : 'Save Draft'}
              </button>
              <button className="btn btn-primary btn-sm" disabled={acting || !canSave} onClick={() => save(true)}>
                {acting ? 'Publishing…' : (editing?.published || form.published) ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>

          <div className="blog-editor-scroll" ref={scrollRef}>
            <div className="blog-editor-body">
              {/* ── Main column ──────────────────────────────────────── */}
              <div>
                <input
                  ref={titleInputRef}
                  className="blog-editor-title-input"
                  placeholder="Post title"
                  value={form.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                />
                <div className="blog-editor-slug-preview">
                  {SITE_URL}/blog/
                  {editingSlug ? (
                    <input
                      className="input"
                      style={{ flex: '1 1 auto', minWidth: 160, padding: '4px 8px', fontSize: 13 }}
                      value={form.slug}
                      autoFocus
                      onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
                      onBlur={() => setEditingSlug(false)}
                    />
                  ) : (
                    <>
                      <code>{form.slug || 'untitled'}</code>
                      <button type="button" className="blog-editor-slug-edit-btn" onClick={() => setEditingSlug(true)}>Edit</button>
                    </>
                  )}
                </div>

                <div className="blog-editor-field-row">
                  <label className="blog-editor-field-label" style={{ marginBottom: 0 }}>Excerpt</label>
                  <Counter value={form.excerpt.length} limit={EXCERPT_LIMIT} />
                </div>
                <textarea
                  className="input mb-3"
                  rows={2}
                  style={{ resize: 'none' }}
                  placeholder="Short summary shown on the blog list and used as the fallback meta description"
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                />

                <div className="card mb-3">
                  <div className="blog-editor-sidebar-title" style={{ marginBottom: 12 }}>✨ Generate with AI</div>
                  <textarea
                    className="input mb-2"
                    rows={2}
                    style={{ resize: 'none' }}
                    placeholder="Describe the post idea, e.g. &quot;why system design interviews trip up freshers even when they know DSA&quot;"
                    value={genIdea}
                    onChange={(e) => setGenIdea(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="input"
                      style={{ flex: '1 1 160px' }}
                      placeholder="Tone (optional)"
                      value={genTone}
                      onChange={(e) => setGenTone(e.target.value)}
                    />
                    <select
                      className="input"
                      style={{ flex: '0 0 140px' }}
                      value={genLength}
                      onChange={(e) => setGenLength(e.target.value as 'short' | 'medium' | 'long')}
                    >
                      <option value="short">Short (~700w)</option>
                      <option value="medium">Medium (~1200w)</option>
                      <option value="long">Long (~2000w)</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: '0 0 auto' }}
                      disabled={generating || !genIdea.trim()}
                      onClick={generateWithAI}
                    >
                      {generating ? 'Writing…' : 'Generate draft'}
                    </button>
                  </div>
                  <div className="text-sm text-muted" style={{ marginTop: 10 }}>
                    Fills in the title and excerpt above, the content below, and the tags/SEO fields in the sidebar. Always review before publishing.
                  </div>
                </div>

                <label className="blog-editor-field-label">Content</label>
                <BlogEditor html={form.contentHtml} onChange={(html) => setForm((f) => ({ ...f, contentHtml: html }))} />
                <div className="blog-editor-meta">{words} words · ~{readMins} min read</div>
              </div>

              {/* ── Sidebar ──────────────────────────────────────────── */}
              <div>
                <div className="blog-editor-sidebar-section">
                  <div className="blog-editor-sidebar-title">Cover image</div>
                  <div
                    className={`blog-editor-dropzone ${dragActive ? 'drag-active' : ''}`}
                    onClick={() => coverInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={onCoverDrop}
                  >
                    {uploadingCover ? (
                      <div className="blog-editor-dropzone-empty">Uploading…</div>
                    ) : form.coverImageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.coverImageUrl} alt="" />
                        <button
                          type="button"
                          className="blog-editor-dropzone-remove"
                          onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, coverImageUrl: null })); }}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="blog-editor-dropzone-empty">🖼 Click or drag an image<br />JPEG, PNG, or WebP — up to 4MB</div>
                    )}
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ''; }}
                  />
                  <input
                    className="input mt-2"
                    placeholder="Alt text (for accessibility + SEO)"
                    value={form.coverImageAlt}
                    onChange={(e) => setForm((f) => ({ ...f, coverImageAlt: e.target.value }))}
                  />
                </div>

                <div className="blog-editor-sidebar-section">
                  <div className="blog-editor-sidebar-title">Tags</div>
                  {form.tags.length > 0 && (
                    <div className="blog-editor-tags">
                      {form.tags.map((tag) => (
                        <span key={tag} className="blog-editor-tag-chip">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} title="Remove tag">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    className="input"
                    placeholder="Type a tag, press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={onTagKeyDown}
                    onBlur={() => addTag(tagInput)}
                  />
                </div>

                <div className="blog-editor-sidebar-section">
                  <div className="blog-editor-sidebar-title">Author</div>
                  <input
                    className="input"
                    placeholder="JavihAI Team"
                    value={form.authorName}
                    onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                  />
                </div>

                <div className="blog-editor-sidebar-section">
                  <div className="blog-editor-sidebar-title">SEO overrides (optional)</div>
                  <div className="blog-editor-status-card">
                    <div className="blog-editor-field-row">
                      <label className="blog-editor-field-label" style={{ marginBottom: 0 }}>SEO title</label>
                      <Counter value={(form.seoTitle || form.title).length} limit={SEO_TITLE_LIMIT} />
                    </div>
                    <input
                      className="input mb-3"
                      placeholder="Falls back to the title above"
                      value={form.seoTitle}
                      onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                    />
                    <div className="blog-editor-field-row">
                      <label className="blog-editor-field-label" style={{ marginBottom: 0 }}>SEO description</label>
                      <Counter value={(form.seoDescription || form.excerpt).length} limit={SEO_DESC_LIMIT} />
                    </div>
                    <textarea
                      className="input"
                      rows={2}
                      style={{ resize: 'none' }}
                      placeholder="Falls back to the excerpt above"
                      value={form.seoDescription}
                      onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
