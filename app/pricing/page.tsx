'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState } from '@/components/DataStates';

interface Offer { active: boolean; label: string; percentOff: number; appliesTo: 'all' | 'starter' | 'standard' | 'pro' | 'power'; expiresAt: number | null }
interface Pricing {
  plans: {
    starter: { oneTime: number };
    standard: { oneTime: number };
    pro: { monthly: number; yearly: number };
    power: { monthly: number; yearly: number };
  };
  offer: Offer;
}

const msToDateInput = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');

export default function AdminPricingPage() {
  const { data, loading, reason, refetch } = useAdminData<Pricing | null>('/api/pricing', null);

  const [form, setForm] = useState<Pricing | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const getPlanPrice = (plan: 'starter' | 'standard' | 'pro' | 'power', field: 'oneTime' | 'monthly' | 'yearly'): number => {
    if (!form) return 0;
    const planData = form.plans[plan];
    if (field === 'oneTime') {
      return (planData as { oneTime: number }).oneTime;
    }
    return (planData as { monthly: number; yearly: number })[field];
  };

  // Sync form when pricing data changes from the server
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (data) setForm(data); }, [data]);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  };

  const setPlan = (plan: 'starter' | 'standard' | 'pro' | 'power', cycle: 'oneTime' | 'monthly' | 'yearly', value: string) => {
    if (!form) return;
    const numVal = Number(value) || 0;
    const updatedPlan = plan === 'starter' || plan === 'standard'
      ? { oneTime: numVal }
      : { ...form.plans[plan], [cycle]: numVal } as { monthly: number; yearly: number };
    setForm({ ...form, plans: { ...form.plans, [plan]: updatedPlan } });
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

  return (
    <AdminShell title="Pricing & Offers" subtitle="Control plan prices &amp; active discounts">
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
        <div style={{ maxWidth: 720 }}>
          <span className="live-indicator" style={{ marginBottom: 20 }}>Live data</span>

          {/* Plan prices */}
          <div className="card-flat" style={{ padding: 20, marginBottom: 20 }}>
            <h3 className="font-semibold mb-1">Plan prices (₹)</h3>
            <p className="text-muted text-sm mb-4">Applies to new checkouts immediately. The server reads these at order time, so it stays tamper-proof.</p>
            {([
              { key: 'starter', label: 'Starter', fields: ['oneTime'] as const },
              { key: 'standard', label: 'Standard', fields: ['oneTime'] as const },
              { key: 'pro', label: 'Pro', fields: ['monthly', 'yearly'] as const },
              { key: 'power', label: 'Power', fields: ['monthly', 'yearly'] as const },
            ] as const).map(({ key, label, fields }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <div className="font-medium" style={{ textTransform: 'capitalize' }}>{label}</div>
                {fields.map((field) => (
                  <label key={field} className="text-sm text-muted" style={{ textTransform: 'capitalize' }}>
                    {field === 'oneTime' ? 'One-time' : field}
                    <input className="input mt-1" type="number" min={0} value={getPlanPrice(key, field)}
                      onChange={(e) => setPlan(key, field, e.target.value)} />
                  </label>
                ))}
                {fields.length === 1 ? <div /> : null}
              </div>
            ))}
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
                    <option value="starter">Starter only</option>
                    <option value="standard">Standard only</option>
                    <option value="pro">Pro only</option>
                    <option value="power">Power only</option>
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
                  Starter: <s className="text-muted">₹{form.plans.starter.oneTime}</s> <strong>₹{preview(form.plans.starter.oneTime)}</strong> &nbsp;·&nbsp;
                  Standard: <s className="text-muted">₹{form.plans.standard.oneTime}</s> <strong>₹{preview(form.plans.standard.oneTime)}</strong> &nbsp;·&nbsp;
                  Pro: <s className="text-muted">₹{form.plans.pro.monthly}</s> <strong>₹{preview(form.plans.pro.monthly)}</strong>/mo &nbsp;·&nbsp;
                  Power: <s className="text-muted">₹{form.plans.power.monthly}</s> <strong>₹{preview(form.plans.power.monthly)}</strong>/mo
                </div>
              </div>
            )}
          </div>

          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save pricing & offer'}
          </button>
        </div>
      )}
    </AdminShell>
  );
}
