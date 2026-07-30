'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import PromotionEditor from '@/components/PromotionEditor';
import EmailTemplateGenerator from '@/components/EmailTemplateGenerator';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';

interface SendRecord {
  id: string;
  subject: string;
  html?: string;
  audience?: string[];
  recipientCount: number;
  sent: number;
  failed: number;
  sentAt: number;
  sentBy: string;
}

interface PromotionsData {
  draft: { subject: string; html: string } | null;
  history: SendRecord[];
  recipientCount: number;
  planCounts: Record<string, number>;
}

const PLAN_OPTIONS: Array<{ id: 'free' | 'quick_pass' | 'pro' | 'power'; label: string }> = [
  { id: 'free', label: 'Free' },
  { id: 'quick_pass', label: 'Quick Pass' },
  { id: 'pro', label: 'Pro' },
  { id: 'power', label: 'Power' },
];

export default function PromotionsPage() {
  const { data, loading, reason, refetch } = useAdminData<PromotionsData>(
    '/api/promotions',
    { draft: null, history: [], recipientCount: 0, planCounts: { free: 0, pro: 0, power: 0 } },
    (json) => json as PromotionsData
  );

  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [audience, setAudience] = useState<'all' | 'plans'>('all');
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [viewing, setViewing] = useState<SendRecord | null>(null);
  const [showTemplateGen, setShowTemplateGen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const flash = (kind: 'ok' | 'err', text: string) => { setToast({ kind, text }); setTimeout(() => setToast(null), 4500); };

  // Hydrate local editor state from the fetched draft exactly once.
  if (!hydrated && reason === 'live') {
    setSubject(data.draft?.subject || '');
    setHtml(data.draft?.html || '');
    setHydrated(true);
  }

  const planCounts = data.planCounts || { free: 0, pro: 0, power: 0 };
  const togglePlan = (id: string) =>
    setSelectedPlans((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  // How many people the current selection reaches.
  const targetCount =
    audience === 'all'
      ? data.recipientCount
      : selectedPlans.reduce((sum, p) => sum + (planCounts[p] || 0), 0);

  const saveDraft = async () => {
    if (!subject.trim() || !html.trim()) { flash('err', 'Subject and content are required'); return; }
    setSaving(true);
    const r = await postAdmin('/api/promotions', { subject, html });
    setSaving(false);
    if (r.ok) flash('ok', 'Draft saved'); else flash('err', r.error || 'Failed to save draft');
  };

  const send = async () => {
    if (!subject.trim() || !html.trim()) { flash('err', 'Subject and content are required'); return; }
    if (audience === 'plans' && selectedPlans.length === 0) { flash('err', 'Select at least one plan'); return; }
    if (targetCount === 0) { flash('err', 'No recipients match this audience'); return; }

    const who = audience === 'all'
      ? `all ${targetCount} subscribers`
      : `${targetCount} subscriber${targetCount === 1 ? '' : 's'} on the ${selectedPlans.join(', ')} plan${selectedPlans.length === 1 ? '' : 's'}`;
    if (!window.confirm(`Send this email to ${who}? This cannot be undone.`)) return;

    setSending(true);
    const r = await postAdmin('/api/promotions/send', {
      subject,
      html,
      confirm: true,
      plans: audience === 'all' ? [] : selectedPlans,
    });
    setSending(false);
    if (r.ok) { flash('ok', 'Promotion sent'); refetch(); }
    else flash('err', r.error || 'Failed to send');
  };

  const sendLabel = sending
    ? 'Sending…'
    : audience === 'all'
      ? `Send to all ${targetCount} subscribers`
      : `Send to ${targetCount} selected`;

  return (
    <AdminShell title="Promotions" subtitle="Compose and send a promotional email to your subscribers">
      {toast && (
        <div className={`admin-toast ${toast.kind === 'ok' ? 'admin-toast-ok' : 'admin-toast-err'}`}>
          {toast.kind === 'ok' ? '✓' : '⚠'} {toast.text}
        </div>
      )}
      {loading ? (
        <Loader label="Loading promotions…" />
      ) : reason !== 'live' ? (
        <ErrorState reason={reason} onRetry={refetch} />
      ) : (
        <>
          <div className="card mb-3">
            <div className="card-header">
              <div>
                <div className="card-title">Compose</div>
                <div className="card-subtitle">{targetCount} subscriber{targetCount === 1 ? '' : 's'} will receive this</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTemplateGen(!showTemplateGen)}>
                {showTemplateGen ? '✕ Close' : '✨ Generate Template'}
              </button>
            </div>

            {showTemplateGen && (
              <div style={{ marginBottom: 16, padding: 14, background: 'var(--surface-2)', borderRadius: 8 }}>
                <EmailTemplateGenerator
                  onTemplateGenerated={(subject, html) => {
                    setSubject(subject);
                    setHtml(html);
                    setShowTemplateGen(false);
                  }}
                />
              </div>
            )}

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Audience</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                className={`btn btn-sm ${audience === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAudience('all')}
              >
                All subscribers ({data.recipientCount})
              </button>
              <button
                className={`btn btn-sm ${audience === 'plans' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAudience('plans')}
              >
                By plan
              </button>
            </div>
            {audience === 'plans' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {PLAN_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    className={`btn btn-sm ${selectedPlans.includes(p.id) ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => togglePlan(p.id)}
                  >
                    {selectedPlans.includes(p.id) ? '✓ ' : ''}{p.label} ({planCounts[p.id] || 0})
                  </button>
                ))}
              </div>
            )}

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Subject</label>
            <input
              className="input mb-3"
              placeholder="🎉 New feature: ..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Email content</label>
            <PromotionEditor html={html} onChange={setHtml} />

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-secondary" onClick={saveDraft} disabled={saving || sending}>
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button className="btn btn-primary" onClick={send} disabled={saving || sending}>
                {sendLabel}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Send history</div>
            </div>
            {data.history.length === 0 ? (
              <div className="empty-state"><div className="empty-state-text">No promotions sent yet</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.history.map((h) => (
                  <div key={h.id} className="card-flat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold">{h.subject}</div>
                      <div className="text-sm text-muted">
                        {new Date(h.sentAt).toLocaleString()} · by {h.sentBy}
                        {h.audience && h.audience.length > 0 && (
                          <> · {h.audience.includes('all') ? 'All subscribers' : `Plans: ${h.audience.join(', ')}`}</>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="badge badge-green">{h.sent} sent</span>
                      {h.failed > 0 && <span className="badge badge-red">{h.failed} failed</span>}
                      {h.html && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setViewing(h)}>View</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {viewing && (
        <div className="drawer-overlay" onClick={() => setViewing(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="drawer-header">
              <div className="drawer-title">{viewing.subject}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setViewing(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
              Sent {new Date(viewing.sentAt).toLocaleString()} · {viewing.sent} delivered
              {viewing.audience && viewing.audience.length > 0 && (
                <> · {viewing.audience.includes('all') ? 'All subscribers' : `Plans: ${viewing.audience.join(', ')}`}</>
              )}
            </div>
            <div
              style={{ background: '#fff', borderRadius: 8, padding: 16, color: '#111', maxHeight: '60vh', overflow: 'auto' }}
              dangerouslySetInnerHTML={{ __html: viewing.html || '' }}
            />
          </div>
        </div>
      )}
    </AdminShell>
  );
}
