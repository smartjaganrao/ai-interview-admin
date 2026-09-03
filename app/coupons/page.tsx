'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState, EmptyState, RefreshBar } from '@/components/DataStates';
import { PLANS, PlanId } from '@/lib/pricing-config';

type DiscountType = 'percent' | 'flat';

interface CouponRecord {
  code: string;
  label: string;
  discountType: DiscountType;
  discountValue: number;
  appliesTo: 'all' | PlanId;
  active: boolean;
  featured: boolean;
  popup: boolean;
  expiresAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface CouponsDoc {
  coupons: Record<string, CouponRecord>;
}

// datetime-local, not date — a popup coupon's countdown needs hour/minute
// precision (a bare date landed at UTC midnight, ~5.5h into the day in IST).
const msToDateTimeInput = (ms: number | null) => {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const oneHourFromNowInput = () => msToDateTimeInput(Date.now() + 60 * 60 * 1000);

const emptyDraft = {
  code: '',
  label: '',
  discountType: 'percent' as DiscountType,
  discountValue: 10,
  appliesTo: 'all' as 'all' | PlanId,
  expiresAt: '',
  active: true,
  featured: false,
  popup: false,
};

export default function AdminCouponsPage() {
  const { data, loading, reason, refetch, dataUpdatedAt } = useAdminData<CouponsDoc | null>('/api/coupons', null);

  const [form, setForm] = useState<CouponsDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftError, setDraftError] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (data) setForm(data); }, [data]);

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && data !== null;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="Coupons" subtitle="Create and manage promotional discount codes"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="Coupons" subtitle="Create and manage promotional discount codes"><Loader label="Loading coupons…" /></AdminShell>;
  }

  const flash = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  };

  const coupons = form?.coupons ?? {};
  const sortedCoupons = Object.values(coupons).sort((a, b) => b.updatedAt - a.updatedAt);

  // Only one coupon should be featured, and only one shown as the popup, at
  // a time — each is a single public display slot, and having two flagged
  // has no defined winner (landing just picks whichever was updated most
  // recently, which is surprising rather than useful).
  const exclusiveToggle = (coupons: Record<string, CouponRecord>, field: 'featured' | 'popup', exceptCode?: string) =>
    Object.fromEntries(
      Object.entries(coupons).map(([code, c]) => [code, code === exceptCode ? c : { ...c, [field]: false }])
    );

  // A popup needs one concrete plan (so its checkout link is unambiguous)
  // and a real future deadline (so its countdown means something) — mirrors
  // the server-side guard in app/api/coupons/route.ts.
  const canBePopup = (c: Pick<CouponRecord, 'appliesTo' | 'expiresAt'>) =>
    c.appliesTo !== 'all' && !!c.expiresAt && c.expiresAt > Date.now();

  const updateCoupon = (code: string, patch: Partial<CouponRecord>) => {
    if (!form) return;
    if (patch.popup && !canBePopup({ ...form.coupons[code], ...patch })) {
      flash('err', 'A popup coupon needs a specific plan (not "All plans") and a future expiry time.');
      return;
    }
    let base = form.coupons;
    if (patch.featured) base = exclusiveToggle(base, 'featured', code);
    if (patch.popup) base = exclusiveToggle(base, 'popup', code);
    setForm({ coupons: { ...base, [code]: { ...base[code], ...patch } } });
  };

  const deleteCoupon = (code: string) => {
    if (!form) return;
    const rest = { ...form.coupons };
    delete rest[code];
    setForm({ coupons: rest });
  };

  const addCoupon = () => {
    const code = draft.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      setDraftError('Code must be 3–24 characters: letters, numbers, - or _');
      return;
    }
    if (form?.coupons[code]) {
      setDraftError('A coupon with this code already exists — edit it below instead.');
      return;
    }
    const discountValue = draft.discountType === 'percent'
      ? Math.max(1, Math.min(90, Math.round(draft.discountValue)))
      : Math.max(1, Math.round(draft.discountValue));
    const expiresAt = draft.expiresAt ? new Date(draft.expiresAt).getTime() : null;
    if (draft.popup && !canBePopup({ appliesTo: draft.appliesTo, expiresAt })) {
      setDraftError('A popup coupon needs a specific plan (not "All plans") and a future expiry time.');
      return;
    }
    const now = Date.now();
    const newCoupon: CouponRecord = {
      code,
      label: draft.label.trim() || code,
      discountType: draft.discountType,
      discountValue,
      appliesTo: draft.appliesTo,
      active: draft.active,
      featured: draft.featured,
      popup: draft.popup,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };
    let base = form?.coupons ?? {};
    if (newCoupon.featured) base = exclusiveToggle(base, 'featured');
    if (newCoupon.popup) base = exclusiveToggle(base, 'popup');
    setForm({ coupons: { ...base, [code]: newCoupon } });
    setDraft(emptyDraft);
    setDraftError('');
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const r = await postAdmin('/api/coupons', { coupons: form.coupons });
    setSaving(false);
    if (r.ok) { flash('ok', r.message || 'Coupons updated'); refetch(); }
    else flash('err', r.error || 'Failed to save');
  };

  const discountLabel = (c: Pick<CouponRecord, 'discountType' | 'discountValue'>) =>
    c.discountType === 'percent' ? `${c.discountValue}% off` : `₹${c.discountValue} off`;

  return (
    <AdminShell title="Coupons" subtitle="Create and manage promotional discount codes">
      <RefreshBar isLive={reason === 'live'} updatedAt={dataUpdatedAt} onRefresh={refetch} />
      {toast && (
        <div className={`admin-toast ${toast.kind === 'ok' ? 'admin-toast-ok' : 'admin-toast-err'}`}>
          {toast.kind === 'ok' ? '✓' : '⚠'} {toast.text}
        </div>
      )}
      {hasCached && (
        <div className="alert alert-warning" style={{ marginBottom: 20, fontSize: 12 }}>
          Showing cached data. Live data unavailable. <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={refetch}>Retry</button>
        </div>
      )}
      {!hasCached && <span className="live-indicator" style={{ marginBottom: 20 }}>Live data</span>}

      <div style={{ maxWidth: 900 }}>
        {/* Existing coupons */}
        <div className="card-flat" style={{ padding: 20, marginBottom: 20 }}>
          <h3 className="font-semibold mb-1">Coupons</h3>
          <p className="text-muted text-sm mb-4">
            A coupon replaces the site-wide offer for that purchase — it never stacks with it. Only one
            featured coupon should be active at a time; it&apos;s what shows on the public pricing banner.
          </p>

          {sortedCoupons.length === 0 ? (
            <EmptyState message="No coupons yet — add one below." />
          ) : (
            sortedCoupons.map((c) => (
              <div key={c.code} className="mb-6 pb-6 border-b border-white/10 last:border-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-white text-lg">{c.code}</div>
                    <div className="text-xs text-slate-400">{c.label}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteCoupon(c.code)}>Delete</button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="text-sm text-muted">
                    Discount
                    <div className="mt-1 text-white font-semibold">{discountLabel(c)}</div>
                  </div>
                  <label className="text-sm text-muted">
                    Applies to
                    <select className="input mt-1" value={c.appliesTo} onChange={(e) => updateCoupon(c.code, { appliesTo: e.target.value as CouponRecord['appliesTo'] })}>
                      <option value="all">All plans</option>
                      {PLANS.filter((p) => p.id !== 'free').map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-muted">
                    Expires (optional, required for popup)
                    <input className="input mt-1" type="datetime-local" value={msToDateTimeInput(c.expiresAt)}
                      onChange={(e) => updateCoupon(c.code, { expiresAt: e.target.value ? new Date(e.target.value).getTime() : null })} />
                  </label>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={c.active} onChange={(e) => updateCoupon(c.code, { active: e.target.checked })} />
                    <span className="text-slate-300">Active</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={c.featured} onChange={(e) => updateCoupon(c.code, { featured: e.target.checked })} />
                    <span className="text-slate-300">Featured on public pricing banner</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm" title='Needs a specific plan and a future expiry time'>
                    <input type="checkbox" checked={c.popup} onChange={(e) => updateCoupon(c.code, { popup: e.target.checked })} />
                    <span className="text-slate-300">Show as new-customer welcome popup</span>
                  </label>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add coupon */}
        <div className="card-flat" style={{ padding: 20, marginBottom: 20 }}>
          <h3 className="font-semibold mb-1">Add a coupon</h3>
          <p className="text-muted text-sm mb-4">Fill this in, then click Add — it&apos;s only saved to Firestore once you click &quot;Save coupons&quot; below.</p>

          <div style={{ display: 'grid', gap: 12 }}>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-sm text-muted">
                Code
                <input className="input mt-1" value={draft.code} placeholder="LAUNCH20"
                  onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
              </label>
              <label className="text-sm text-muted">
                Label (shown to users)
                <input className="input mt-1" value={draft.label} placeholder="Launch week special"
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <label className="text-sm text-muted">
                Discount type
                <select className="input mt-1" value={draft.discountType} onChange={(e) => setDraft({ ...draft, discountType: e.target.value as DiscountType })}>
                  <option value="percent">Percent off</option>
                  <option value="flat">Flat ₹ off</option>
                </select>
              </label>
              <label className="text-sm text-muted">
                {draft.discountType === 'percent' ? '% off' : '₹ off'}
                <input className="input mt-1" type="number" min={1} max={draft.discountType === 'percent' ? 90 : undefined}
                  value={draft.discountValue} onChange={(e) => setDraft({ ...draft, discountValue: Number(e.target.value) || 0 })} />
              </label>
              <label className="text-sm text-muted">
                Applies to
                <select className="input mt-1" value={draft.appliesTo} onChange={(e) => setDraft({ ...draft, appliesTo: e.target.value as 'all' | PlanId })}>
                  <option value="all">All plans</option>
                  {PLANS.filter((p) => p.id !== 'free').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-sm text-muted">
                Expires (optional, required for popup)
                <input className="input mt-1" type="datetime-local" value={draft.expiresAt}
                  onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} />
                {draft.popup && !draft.expiresAt && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }}
                    onClick={() => setDraft({ ...draft, expiresAt: oneHourFromNowInput() })}>
                    Set to 1 hour from now
                  </button>
                )}
              </label>
              <div className="flex items-end gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                  <span className="text-slate-300">Active</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} />
                  <span className="text-slate-300">Featured</span>
                </label>
                <label className="flex items-center gap-2 text-sm" title='Needs a specific plan and a future expiry time'>
                  <input type="checkbox" checked={draft.popup} onChange={(e) => setDraft({ ...draft, popup: e.target.checked })} />
                  <span className="text-slate-300">Show as popup</span>
                </label>
              </div>
            </div>
            {draftError && <p className="text-sm" style={{ color: '#FF6961' }}>{draftError}</p>}
            <button className="btn btn-secondary" onClick={addCoupon} style={{ justifySelf: 'start' }}>Add coupon</button>
          </div>
        </div>

        <button className="btn btn-primary" disabled={saving} onClick={save} style={{ marginTop: 8 }}>
          {saving ? 'Saving…' : 'Save coupons'}
        </button>
      </div>
    </AdminShell>
  );
}
