'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';
import {
  PLANS,
  PlanId,
} from '@/lib/pricing-config';

interface Offer { active: boolean; label: string; percentOff: number; appliesTo: 'all' | PlanId; expiresAt: number | null }
interface PlanFields {
  oneTime: number;
  monthly: number;
  yearly: number;
  active: boolean;
  displayOrder: number;
  badge: string;
  highlighted: boolean;
}
type AdminPlanData = Record<PlanId, PlanFields>;
interface Pricing {
  plans: AdminPlanData;
  offer: Offer;
}

const msToDateInput = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');

export default function AdminPricingPage() {
  const { data, loading, reason, refetch } = useAdminData<Pricing | null>('/api/pricing', null);

  const [form, setForm] = useState<Pricing | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Sync remote pricing into local editable form. This is a legitimate
  // effect-driven state sync: data comes from an async API, and we keep a
  // local mutable copy so edits don't clobber the source until Save.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (data) setForm(data); }, [data]);

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && data !== null;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="Pricing & Plans" subtitle="Control plan prices, features, badges, and display order"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="Pricing & Plans" subtitle="Control plan prices, features, badges, and display order"><Loader label="Loading pricing…" /></AdminShell>;
  }

  const getPlanFields = (plan: PlanId): PlanFields => {
    if (!form) {
      const fallback = PLANS.find(p => p.id === plan);
      return {
        oneTime: fallback?.price ?? 0,
        monthly: fallback?.price ?? 0,
        yearly: fallback?.price ?? 0,
        active: fallback?.isActive ?? true,
        displayOrder: fallback?.displayOrder ?? 0,
        badge: fallback?.badge ?? '',
        highlighted: fallback?.isHighlighted ?? false,
      };
    }
    const raw = form.plans[plan] || {};
    return {
      oneTime: raw.oneTime ?? 0,
      monthly: raw.monthly ?? 0,
      yearly: raw.yearly ?? 0,
      active: raw.active ?? true,
      displayOrder: raw.displayOrder ?? 0,
      badge: raw.badge ?? '',
      highlighted: raw.highlighted ?? false,
    };
  };

  const flash = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  };

  const setPlan = (plan: PlanId, cycle: 'oneTime' | 'monthly' | 'yearly', value: string) => {
    if (!form) return;
    const numVal = Number(value) || 0;
    setForm({
      ...form,
      plans: {
        ...form.plans,
        [plan]: {
          ...getPlanFields(plan),
          [cycle]: numVal,
        },
      },
    });
  };

  const setPlanFlag = (plan: PlanId, flag: 'active' | 'displayOrder' | 'badge' | 'highlighted', value: boolean | number | string) => {
    if (!form) return;
    setForm({
      ...form,
      plans: {
        ...form.plans,
        [plan]: {
          ...getPlanFields(plan),
          [flag]: value,
        },
      },
    });
  };

  const setOffer = (patch: Partial<Offer>) => {
    if (!form) return;
    setForm({ ...form, offer: { ...form.offer, ...patch } });
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const r = await postAdmin('/api/pricing', { plans: form.plans, offer: form.offer });
    setSaving(false);
    if (r.ok) { flash('ok', r.message || 'Pricing updated'); refetch(); }
    else flash('err', r.error || 'Failed to save');
  };

  const sortedPlans = [...PLANS].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <AdminShell title="Pricing & Plans" subtitle="Control plan prices, features, badges, and display order">
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
        {/* Plan Management */}
        <div className="card-flat" style={{ padding: 20, marginBottom: 20 }}>
          <h3 className="font-semibold mb-1">Plan Management</h3>
          <p className="text-muted text-sm mb-4">Configure each plan: price, duration, features, badge, highlight, and display order.</p>
          {sortedPlans.map((planConfig) => {
            const planKey = planConfig.id;
            const fields = getPlanFields(planKey);
            const isOneTime = planConfig.billingType === 'one_time';
            const price = isOneTime ? fields.oneTime : fields.monthly;
            return (
              <div key={planKey} className="mb-6 pb-6 border-b border-white/10 last:border-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${planConfig.gradient} flex items-center justify-center text-xl`}>
                      {planConfig.emoji}
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{planConfig.name}</div>
                      <div className="text-xs text-slate-400">{planConfig.tagline}</div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Active</span>
                    <input
                      type="checkbox"
                      checked={fields.active}
                      onChange={(e) => setPlanFlag(planKey, 'active', e.target.checked)}
                    />
                  </label>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <label className="text-sm text-muted">
                    Price (₹)
                    <input className="input mt-1" type="number" min={0} value={price}
                      onChange={(e) => setPlan(planKey, isOneTime ? 'oneTime' : 'monthly', e.target.value)} />
                  </label>
                  {!isOneTime && (
                    <label className="text-sm text-muted">
                      Yearly Price (₹)
                      <input className="input mt-1" type="number" min={0} value={fields.yearly}
                        onChange={(e) => setPlan(planKey, 'yearly', e.target.value)} />
                    </label>
                  )}
                  <label className="text-sm text-muted">
                    Display Order
                    <input className="input mt-1" type="number" min={0} value={fields.displayOrder}
                      onChange={(e) => setPlanFlag(planKey, 'displayOrder', Number(e.target.value) || 0)} />
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <label className="text-sm text-muted">
                    Badge (e.g. &quot;Best Value&quot;, &quot;Most Popular&quot;)
                    <input className="input mt-1" value={fields.badge}
                      onChange={(e) => setPlanFlag(planKey, 'badge', e.target.value)}
                      placeholder={planConfig.badge || 'Leave empty for no badge'} />
                  </label>
                  <label className="flex items-center gap-2 text-sm mt-6">
                    <input
                      type="checkbox"
                      checked={fields.highlighted}
                      onChange={(e) => setPlanFlag(planKey, 'highlighted', e.target.checked)}
                    />
                    <span className="text-slate-300">Highlight this plan (scales up)</span>
                  </label>
                </div>

                <div className="text-xs text-slate-500">
                  Billing: {planConfig.billingType === 'subscription' ? 'Monthly Subscription' : 'One-time purchase'} •
                  Duration: {planConfig.durationValue} {planConfig.durationType} •
                  {planConfig.isUnlimited ? 'Unlimited usage' : `${planConfig.usageLimit} hour${planConfig.usageLimit !== 1 ? 's' : ''} usage`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Offer */}
        <div className="card-flat" style={{ padding: 20, marginBottom: 20 }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">Active offer</h3>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form?.offer.active} onChange={(e) => setOffer({ active: e.target.checked })} />
              {form?.offer.active ? 'On' : 'Off'}
            </label>
          </div>
          <p className="text-muted text-sm mb-4">A single site-wide discount, shown on pricing + checkout and applied automatically at order time.</p>

          <div style={{ display: 'grid', gap: 12 }}>
            <label className="text-sm text-muted">Label (shown to users)
              <input className="input mt-1" placeholder="Launch offer — 20% off" value={form?.offer.label ?? ''}
                onChange={(e) => setOffer({ label: e.target.value })} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <label className="text-sm text-muted">% off
                <input className="input mt-1" type="number" min={0} max={90} value={form?.offer.percentOff ?? 0}
                  onChange={(e) => setOffer({ percentOff: Math.max(0, Math.min(90, Number(e.target.value) || 0)) })} />
              </label>
              <label className="text-sm text-muted">Applies to
                <select className="input mt-1" value={form?.offer.appliesTo ?? 'all'} onChange={(e) => setOffer({ appliesTo: e.target.value as Offer['appliesTo'] })}>
                  <option value="all">All plans</option>
                  {sortedPlans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-muted">Expires (optional)
                <input className="input mt-1" type="date" value={msToDateInput(form?.offer.expiresAt ?? null)}
                  onChange={(e) => setOffer({ expiresAt: e.target.value ? new Date(e.target.value).getTime() : null })} />
              </label>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" disabled={saving} onClick={save} style={{ marginTop: 8 }}>
          {saving ? 'Saving…' : 'Save pricing & plans'}
        </button>
      </div>
    </AdminShell>
  );
}
