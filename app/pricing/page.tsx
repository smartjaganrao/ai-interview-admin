'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';
import {
  PLANS,
  PlanId,
  PLAN_RANK,
  getPlanById,
  migratePlanId,
} from '@/lib/pricing-config';

interface Offer { active: boolean; label: string; percentOff: number; appliesTo: 'all' | PlanId; expiresAt: number | null }
interface AdminPlanData {
  free: { oneTime: number; active?: boolean; displayOrder?: number; badge?: string; highlighted?: boolean };
  quick_pass: { oneTime: number; active?: boolean; displayOrder?: number; badge?: string; highlighted?: boolean };
  pro: { oneTime: number; active?: boolean; displayOrder?: number; badge?: string; highlighted?: boolean };
  power: { monthly: number; yearly: number; active?: boolean; displayOrder?: number; badge?: string; highlighted?: boolean };
}
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

  const getPlanPrice = (plan: PlanId, field: 'oneTime' | 'monthly' | 'yearly'): number => {
    if (!form) return 0;
    const planData = (form.plans as any)[plan];
    if (!planData) return 0;
    if (field === 'oneTime') return planData.oneTime ?? 0;
    return planData[field] ?? 0;
  };

  const getPlanActive = (plan: PlanId): boolean => {
    if (!form) return true;
    return (form.plans as any)[plan]?.active ?? true;
  };

  const getPlanDisplayOrder = (plan: PlanId): number => {
    if (!form) return PLANS.find(p => p.id === plan)?.displayOrder ?? 0;
    return (form.plans as any)[plan]?.displayOrder ?? PLANS.find(p => p.id === plan)?.displayOrder ?? 0;
  };

  const getPlanBadge = (plan: PlanId): string => {
    if (!form) return PLANS.find(p => p.id === plan)?.badge ?? '';
    return (form.plans as any)[plan]?.badge ?? PLANS.find(p => p.id === plan)?.badge ?? '';
  };

  const getPlanHighlighted = (plan: PlanId): boolean => {
    if (!form) return PLANS.find(p => p.id === plan)?.isHighlighted ?? false;
    return (form.plans as any)[plan]?.highlighted ?? PLANS.find(p => p.id === plan)?.isHighlighted ?? false;
  };

  useEffect(() => { if (data) setForm(data); }, [data]);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  };

  const setPlan = (plan: PlanId, cycle: 'oneTime' | 'monthly' | 'yearly', value: string) => {
    if (!form) return;
    const numVal = Number(value) || 0;
    const currentPlanData = (form.plans as any)[plan] || {};
    const updatedPlanData = { ...currentPlanData, [cycle]: numVal };
    setForm({ ...form, plans: { ...form.plans, [plan]: updatedPlanData } as any });
  };

  const setPlanFlag = (plan: PlanId, flag: 'active' | 'displayOrder' | 'badge' | 'highlighted', value: any) => {
    if (!form) return;
    const currentPlanData = (form.plans as any)[plan] || {};
    setForm({ ...form, plans: { ...form.plans, [plan]: { ...currentPlanData, [flag]: value } } as any });
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

  const preview = (base: number) =>
    form?.offer.active && form.offer.percentOff > 0
      ? Math.max(1, Math.round(base * (1 - form.offer.percentOff / 100)))
      : base;

  const sortedPlans = [...PLANS].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <AdminShell title="Pricing & Plans" subtitle="Control plan prices, features, badges, and display order">
      {toast && (
        <div className={`admin-toast ${toast.kind === 'ok' ? 'admin-toast-ok' : 'admin-toast-err'}`}>
          {toast.kind === 'ok' ? '✓' : '⚠'} {toast.text}
        </div>
      )}
      {loading || !form ? (
        <Loader label="Loading pricing…" />
      ) : reason !== 'live' ? (
        <ErrorState reason={reason} onRetry={refetch} />
      ) : (
        <div style={{ maxWidth: 900 }}>
          <span className="live-indicator" style={{ marginBottom: 20 }}>Live data</span>

          {/* Plan Management */}
          <div className="card-flat" style={{ padding: 20, marginBottom: 20 }}>
            <h3 className="font-semibold mb-1">Plan Management</h3>
            <p className="text-muted text-sm mb-4">Configure each plan: price, duration, features, badge, highlight, and display order.</p>
            {sortedPlans.map((planConfig) => {
              const planKey = planConfig.id;
              const planData = (form.plans as any)[planKey] || {};
              const isOneTime = planConfig.billingType === 'one_time';
              const price = getPlanPrice(planKey, isOneTime ? 'oneTime' : 'monthly');
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
                        checked={getPlanActive(planKey)}
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
                        <input className="input mt-1" type="number" min={0} value={getPlanPrice(planKey, 'yearly')}
                          onChange={(e) => setPlan(planKey, 'yearly', e.target.value)} />
                      </label>
                    )}
                    <label className="text-sm text-muted">
                      Display Order
                      <input className="input mt-1" type="number" min={0} value={getPlanDisplayOrder(planKey)}
                        onChange={(e) => setPlanFlag(planKey, 'displayOrder', Number(e.target.value) || 0)} />
                    </label>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <label className="text-sm text-muted">
                      Badge (e.g. &quot;Best Value&quot;, &quot;Most Popular&quot;)
                      <input className="input mt-1" value={getPlanBadge(planKey)}
                        onChange={(e) => setPlanFlag(planKey, 'badge', e.target.value)}
                        placeholder={planConfig.badge || 'Leave empty for no badge'} />
                    </label>
                    <label className="flex items-center gap-2 text-sm mt-6">
                      <input
                        type="checkbox"
                        checked={getPlanHighlighted(planKey)}
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
                <input type="checkbox" checked={form.offer.active} onChange={(e) => setOffer({ active: e.target.checked })} />
                {form.offer.active ? 'On' : 'Off'}
              </label>
            </div>
            <p className="text-muted text-sm mb-4">A single site-wide discount, shown on pricing + checkout and applied automatically at order time.</p>

            <div style={{ display: 'grid', gap: 12 }}>
              <label className="text-sm text-muted">Label (shown to users)
                <input className="input mt-1" placeholder="Launch offer — 20% off" value={form.offer.label}
                  onChange={(e) => setOffer({ label: e.target.value })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <label className="text-sm text-muted">% off
                  <input className="input mt-1" type="number" min={0} max={90} value={form.offer.percentOff}
                    onChange={(e) => setOffer({ percentOff: Math.max(0, Math.min(90, Number(e.target.value) || 0)) })} />
                </label>
                <label className="text-sm text-muted">Applies to
                  <select className="input mt-1" value={form.offer.appliesTo} onChange={(e) => setOffer({ appliesTo: e.target.value as Offer['appliesTo'] })}>
                    <option value="all">All plans</option>
                    {sortedPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-muted">Expires (optional)
                  <input className="input mt-1" type="date" value={msToDateInput(form.offer.expiresAt)}
                    onChange={(e) => setOffer({ expiresAt: e.target.value ? new Date(e.target.value).getTime() : null })} />
                </label>
              </div>
            </div>

            {form.offer.active && form.offer.percentOff > 0 && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <div className="text-sm" style={{ color: '#10B981', marginBottom: 6 }}>Preview with offer applied:</div>
                <div className="text-sm">
                  {sortedPlans.filter(p => p.id !== 'free').map(p => {
                    const base = getPlanPrice(p.id, p.billingType === 'one_time' ? 'oneTime' : 'monthly');
                    const prev = `<s className="text-muted">₹${base}</s>`;
                    const eff = preview(base);
                    return <span key={p.id}>{p.name}: {prev} <strong>₹{eff}</strong> &nbsp;·&nbsp;</span>;
                  })}
                </div>
              </div>
            )}
          </div>

          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save pricing & plans'}
          </button>
        </div>
      )}
    </AdminShell>
  );
}
