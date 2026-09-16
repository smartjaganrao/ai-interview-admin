'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { Loader, ErrorState, relTime } from '@/components/DataStates';
import { getPlanName, type AnyPlanId } from '@/lib/pricing-config';

interface Purchase {
  uid: string; email: string; name: string;
  plan: 'quick_pass' | 'pro' | 'power' | string;
  actualPlan: string | null;
  planMismatch: boolean;
  isRealPayment: boolean;
  billing: 'monthly' | 'yearly' | 'one-time' | null;
  amount: number;
  status: string;
  startedAt: number | null;
  planExpiresAt: number | null;
  paymentId: string | null;
  orderId: string | null;
  couponCode: string | null;
  adminGranted: boolean;
  countTowardRevenue: boolean;
  refundedAt: number | null;
}
interface PurchaseStats {
  total: number; totalTransactions: number; active: number; expired: number; refunded: number; mismatched: number;
  lifetimeRevenue: number; activeRevenue: number; refundedAmount: number;
}

const PLAN_BADGE: Record<string, string> = { quick_pass: 'badge-emerald', pro: 'badge-indigo', power: 'badge-purple' };
const STATUS_BADGE: Record<string, string> = { active: 'badge-green', expired: 'badge-slate', refunded: 'badge-red', unknown: 'badge-slate' };
const AVATAR_COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

function dateLabel(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
function isPastExpiry(ts: number): boolean {
  return ts < Date.now();
}
function billingLabel(billing: string | null): string {
  if (billing === 'monthly') return 'Monthly';
  if (billing === 'yearly') return 'Yearly';
  if (billing === 'one-time') return 'One-time';
  return '—';
}

export default function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState<Purchase | null>(null);

  const { data, loading, reason, refetch, dataUpdatedAt } = useAdminData<{ purchases: Purchase[]; stats: PurchaseStats }>(
    '/api/purchases/list',
    { purchases: [], stats: { total: 0, totalTransactions: 0, active: 0, expired: 0, refunded: 0, mismatched: 0, lifetimeRevenue: 0, activeRevenue: 0, refundedAmount: 0 } },
    (json) => {
      const j = json as { purchases?: Purchase[]; stats?: PurchaseStats };
      const arr = j.purchases || [];
      return {
        purchases: arr,
        stats: j.stats || { total: arr.length, totalTransactions: 0, active: 0, expired: 0, refunded: 0, mismatched: 0, lifetimeRevenue: 0, activeRevenue: 0, refundedAmount: 0 },
      };
    }
  );
  const purchases = data.purchases;
  const stats: PurchaseStats = {
    total: data.stats?.total ?? 0,
    totalTransactions: data.stats?.totalTransactions ?? 0,
    active: data.stats?.active ?? 0,
    expired: data.stats?.expired ?? 0,
    refunded: data.stats?.refunded ?? 0,
    mismatched: data.stats?.mismatched ?? 0,
    lifetimeRevenue: data.stats?.lifetimeRevenue ?? 0,
    activeRevenue: data.stats?.activeRevenue ?? 0,
    refundedAmount: data.stats?.refundedAmount ?? 0,
  };

  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };
  const handlePlanFilterChange = (val: string) => { setPlanFilter(val); setPage(1); };
  const handleStatusFilterChange = (val: string) => { setStatusFilter(val); setPage(1); };
  const handleLimitChange = (val: number) => { setLimit(val); setPage(1); };

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && data.purchases.length > 0;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="Purchases" subtitle="Full purchase history — active, expired & refunded"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="Purchases" subtitle="Full purchase history — active, expired & refunded"><Loader label="Loading purchases…" /></AdminShell>;
  }

  const filtered = purchases.filter((p) => {
    const s = search.toLowerCase();
    return (
      (p.email.toLowerCase().includes(s) || p.name.toLowerCase().includes(s)) &&
      (planFilter === 'all' || p.plan === planFilter) &&
      (statusFilter === 'all' || p.status === statusFilter)
    );
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.ceil(totalFiltered / limit) || 1;
  const safePage = Math.min(page, totalPages);
  const startIdx = totalFiltered > 0 ? (safePage - 1) * limit + 1 : 0;
  const endIdx = Math.min(safePage * limit, totalFiltered);
  const paginatedPurchases = filtered.slice((safePage - 1) * limit, safePage * limit);

  return (
    <AdminShell title="Purchases" subtitle="Full purchase history — active, expired & refunded">
      {hasCached && (
        <div className="alert alert-warning" style={{ marginBottom: 20, fontSize: 12 }}>
          Showing cached data. Live data unavailable. <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={refetch}>Retry</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        {!hasCached && <span className="live-indicator">Live data</span>}
        {dataUpdatedAt > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Updated {relTime(dataUpdatedAt)}</span>
        )}
      </div>

      {/* Stats — lifetime revenue leads deliberately: it's the number that
          should NEVER drop just because a plan expires (expiry is an access
          event, not a money event — the payment already happened and was
          kept). Active revenue is the separate, current-snapshot figure that
          DOES drop on expiry/refund, shown right next to it so the two are
          never mistaken for each other. */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Lifetime Revenue', value: `₹${stats.lifetimeRevenue.toLocaleString('en-IN')}`, hint: 'All real payments ever kept — never drops when a plan expires', shortHint: 'Never drops on expiry' },
          { label: 'Active Revenue', value: `₹${stats.activeRevenue.toLocaleString('en-IN')}`, hint: 'Real payments on currently-active plans only', shortHint: 'Active plans only' },
          { label: 'Total Transactions', value: stats.totalTransactions, hint: 'Every individual real payment — a customer who bought twice counts as 2 here', shortHint: 'Repeat buyers count twice' },
          { label: 'Customers', value: stats.total, hint: 'Distinct customers below — one row each, even if they bought more than once', shortHint: 'Distinct customers, deduped' },
          { label: 'Active', value: stats.active },
          { label: 'Expired', value: stats.expired },
          { label: 'Refunded', value: stats.refunded },
          ...(stats.refundedAmount > 0 ? [{ label: 'Refunded Amount', value: `₹${stats.refundedAmount.toLocaleString('en-IN')}`, hint: 'Money actually returned — already excluded from Lifetime Revenue', shortHint: 'Excluded from Lifetime Revenue' }] : []),
          ...(stats.mismatched > 0 ? [{ label: 'Plan Mismatch ⚠', value: stats.mismatched }] : []),
        ].map((s, i) => (
          <div key={i} className="stat-card" title={s.hint}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            {'shortHint' in s && s.shortHint && <div className="stat-hint">{s.shortHint}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="input-group" style={{ width: 280 }}>
          <svg className="input-group-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input" placeholder="Search purchasers…" value={search} onChange={(e) => handleSearchChange(e.target.value)}/>
        </div>
        <select className="input" style={{ width: 140 }} value={planFilter} onChange={(e) => handlePlanFilterChange(e.target.value)}>
          <option value="all">All Plans</option><option value="quick_pass">Quick Pass</option><option value="pro">Pro</option><option value="power">Power</option>
        </select>
        <select className="input" style={{ width: 140 }} value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)}>
          <option value="all">All Status</option><option value="active">Active</option><option value="expired">Expired</option><option value="refunded">Refunded</option>
        </select>
        <div className="filter-bar-right">
          <button className="btn btn-secondary btn-sm" onClick={refetch}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Table (desktop/tablet) */}
      <div className="card-flat">
        <div className="overflow-x-auto hidden md:block">
          <table className="data-table data-table-compact">
            <thead>
              <tr>
                <th style={{ width: 32, color: 'var(--text-muted)', fontSize: 11 }}>#</th>
                <th>Customer</th><th>Plan</th><th>Billing</th><th>Amount</th><th>Status</th><th>Started</th><th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPurchases.map((p, idx) => (
                <tr key={p.uid} style={{ cursor: 'pointer' }} onClick={() => setDetail(p)}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{startIdx + idx}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-sm" style={{ background: AVATAR_COLORS[(p.name?.charCodeAt(0) || 65) % AVATAR_COLORS.length] }}>
                        {(p.name || p.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium" style={{ fontSize: 13, lineHeight: 1.3 }}>{p.name || p.email.split('@')[0]}</div>
                        <div className="text-muted" style={{ fontSize: 11, lineHeight: 1.3 }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <span className={`badge ${PLAN_BADGE[p.plan] || 'badge-slate'}`}>{getPlanName(p.plan as AnyPlanId).toUpperCase()}</span>
                      {!p.isRealPayment && (
                        <span className="badge badge-orange" style={{ fontSize: 9, padding: '1px 4px' }} title="No real payment on file — a free comp, not counted in Revenue above">Comp</span>
                      )}
                      {p.isRealPayment && p.adminGranted && (
                        <span className="badge badge-slate" style={{ fontSize: 9, padding: '1px 4px' }} title="An admin adjusted this plan, but a real payment is on file — still counted in Revenue above">Admin-adjusted</span>
                      )}
                      {p.planMismatch && (
                        <span
                          className="badge badge-red"
                          style={{ fontSize: 9, padding: '1px 4px' }}
                          title={`This subscription record says "${p.plan}", but the user's actual account plan (what really gates their quota) is "${p.actualPlan}". These should always match — worth checking.`}
                        >
                          ⚠ Mismatch
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-muted">{billingLabel(p.billing)}</td>
                  <td className="text-muted">{p.amount > 0 ? `₹${p.amount.toLocaleString('en-IN')}` : '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-slate'}`}>{p.status}</span></td>
                  <td className="text-muted" style={{ fontSize: 11 }}>{dateLabel(p.startedAt)}</td>
                  <td style={{ fontSize: 11 }}>
                    <span className={p.planExpiresAt && isPastExpiry(p.planExpiresAt) ? 'text-red-400' : 'text-muted'}>
                      {dateLabel(p.planExpiresAt)}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-text">{purchases.length === 0 ? 'No purchases yet' : 'No purchases match your filters'}</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card list (mobile) */}
        <div className="md:hidden">
          {paginatedPurchases.length > 0 && (
            <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Showing {startIdx}–{endIdx} of {totalFiltered} purchases</span>
            </div>
          )}
          {paginatedPurchases.map((p, idx) => (
            <div
              key={p.uid}
              onClick={() => setDetail(p)}
              style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{startIdx + idx}</span>
                  <div className="avatar" style={{ background: AVATAR_COLORS[(p.name?.charCodeAt(0) || 65) % AVATAR_COLORS.length] }}>
                    {(p.name || p.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{p.name || p.email.split('@')[0]}</div>
                    <div className="text-sm text-muted">{p.email}</div>
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[p.status] || 'badge-slate'}`}>{p.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>Plan</div>
                  <div className="flex items-center gap-1">
                    <span className={`badge ${PLAN_BADGE[p.plan] || 'badge-slate'}`}>{getPlanName(p.plan as AnyPlanId).toUpperCase()}</span>
                    {!p.isRealPayment && <span className="badge badge-orange" style={{ fontSize: 9, padding: '1px 4px' }} title="No real payment on file">Comp</span>}
                    {p.isRealPayment && p.adminGranted && <span className="badge badge-slate" style={{ fontSize: 9, padding: '1px 4px' }} title="Admin-adjusted, but a real payment is on file">Admin-adjusted</span>}
                    {p.planMismatch && <span className="badge badge-red" style={{ fontSize: 9, padding: '1px 4px' }} title={`Account plan is actually "${p.actualPlan}"`}>⚠</span>}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>Amount</div>
                  <div>{p.amount > 0 ? `₹${p.amount.toLocaleString('en-IN')}` : '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>Started</div>
                  <div className="text-muted">{dateLabel(p.startedAt)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>Expires</div>
                  <div className={p.planExpiresAt && isPastExpiry(p.planExpiresAt) ? 'text-red-400' : 'text-muted'}>
                    {dateLabel(p.planExpiresAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state"><div className="empty-state-text">{purchases.length === 0 ? 'No purchases yet' : 'No purchases match your filters'}</div></div>
          )}
        </div>

        {/* Pagination Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing <strong>{startIdx}–{endIdx}</strong> of <strong>{totalFiltered}</strong> customers
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Per page:</span>
              <select
                className="input"
                style={{ padding: '2px 6px', fontSize: 12, width: 64 }}
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              title="First Page"
            >
              « First
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
            >
              ‹ Prev
            </button>

            <span style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 4px' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              Next ›
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              title="Last Page"
            >
              Last »
            </button>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="drawer-overlay" onClick={() => setDetail(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">Purchase Details</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>{(detail.name || detail.email).charAt(0).toUpperCase()}</div>
              <div className="font-semibold" style={{ fontSize: 15, marginBottom: 2 }}>{detail.name || detail.email.split('@')[0]}</div>
              <div className="text-muted text-sm">{detail.email}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`badge ${PLAN_BADGE[detail.plan] || 'badge-slate'}`}>{getPlanName(detail.plan as AnyPlanId).toUpperCase()}</span>
                <span className={`badge ${STATUS_BADGE[detail.status] || 'badge-slate'}`}>{detail.status}</span>
                {!detail.isRealPayment && (
                  <span className="badge badge-orange" title="No real payment on file — a free comp">Comp</span>
                )}
                {detail.isRealPayment && detail.adminGranted && (
                  <span className="badge badge-slate" title="An admin adjusted this plan, but a real payment is on file">Admin-adjusted</span>
                )}
              </div>
              {detail.planMismatch && (
                <div className="text-xs" style={{ color: 'var(--danger, #f87171)', marginTop: 8 }}>
                  ⚠ Subscription record says &quot;{detail.plan}&quot;, but this account&apos;s actual plan (what gates their quota) is &quot;{detail.actualPlan}&quot;. Worth checking on the Users page.
                </div>
              )}
            </div>
            <div className="divider"/>
            <div>
              {[
                { label: 'User ID', value: detail.uid },
                { label: 'Billing', value: billingLabel(detail.billing) },
                { label: 'Amount Paid', value: detail.amount > 0 ? `₹${detail.amount.toLocaleString('en-IN')}` : '—' },
                { label: 'Started', value: dateLabel(detail.startedAt) },
                { label: 'Expires', value: dateLabel(detail.planExpiresAt) },
                { label: 'Payment ID', value: detail.paymentId || '—' },
                { label: 'Order ID', value: detail.orderId || '—' },
                { label: 'Coupon Used', value: detail.couponCode || '—' },
                { label: 'Counts Toward Revenue', value: detail.isRealPayment ? 'Yes' : 'No' },
                ...(detail.refundedAt ? [{ label: 'Refunded', value: dateLabel(detail.refundedAt) }] : []),
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-muted text-sm">{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted" style={{ marginTop: 16, lineHeight: 1.6 }}>
              Plan changes happen from the Users page. Expired plans revert to Free automatically via the daily email-schedule cron — nothing to do here.
            </p>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
