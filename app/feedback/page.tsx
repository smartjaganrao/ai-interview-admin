'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { Loader, ErrorState, RefreshBar } from '@/components/DataStates';

interface FeedbackItem {
  id: string;
  rating: number;
  category: string;
  message: string;
  userEmail: string;
  userName: string;
  userId: string | null;
  platform: string;
  status: string;
  createdAt: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  feature: '✨ Feature Request',
  ux: '🎨 UX & Design',
  bug: '🐞 Bug Report',
  performance: '⚡ Speed & AI Quality',
  other: '💬 General Feedback',
};

const CATEGORY_BADGES: Record<string, string> = {
  feature: 'badge-purple',
  ux: 'badge-indigo',
  bug: 'badge-red',
  performance: 'badge-orange',
  other: 'badge-slate',
};

export default function AdminFeedbackPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const url = `/api/feedback?page=${page}&limit=${limit}${
    ratingFilter !== 'all' ? `&rating=${ratingFilter}` : ''
  }${categoryFilter !== 'all' ? `&category=${categoryFilter}` : ''}`;

  const { data, loading, reason, refetch, dataUpdatedAt } = useAdminData<{
    feedback: FeedbackItem[];
    total: number;
    overallTotal: number;
    avgRating: number;
    ratingDistribution: Record<number, number>;
    totalPages: number;
  }>(url, {
    feedback: [],
    total: 0,
    overallTotal: 0,
    avgRating: 5.0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    totalPages: 1,
  });

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return (
        <AdminShell title="Customer Feedback" subtitle="Ratings, suggestions & CSAT analytics">
          <ErrorState reason={reason} onRetry={refetch} />
        </AdminShell>
      );
    }
    return (
      <AdminShell title="Customer Feedback" subtitle="Ratings, suggestions & CSAT analytics">
        <Loader label="Loading customer feedback…" />
      </AdminShell>
    );
  }

  const items = data.feedback || [];
  const totalItems = data.total;
  const overallTotal = data.overallTotal || totalItems;
  const totalPages = data.totalPages || Math.ceil(totalItems / limit) || 1;
  const avgRating = data.avgRating || 5.0;
  const dist = data.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const fiveStarPercent = overallTotal > 0 ? Math.round((dist[5] / overallTotal) * 100) : 100;

  return (
    <AdminShell title="Customer Feedback" subtitle="Ratings, suggestions & CSAT analytics">
      <RefreshBar isLive={true} updatedAt={dataUpdatedAt} onRefresh={refetch} />

      {/* ==================== SUMMARY KPIS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-label">Average CSAT Rating</div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="stat-value text-amber-400">{avgRating.toFixed(1)}</div>
            <div className="text-amber-400 text-lg">★</div>
          </div>
          <div className="text-xs text-slate-400 mt-1">From {overallTotal} total reviews</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">5-Star Satisfaction</div>
          <div className="stat-value text-green-400 mt-1">{fiveStarPercent}%</div>
          <div className="text-xs text-slate-400 mt-1">{dist[5]} five-star submissions</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Submissions</div>
          <div className="stat-value text-white mt-1">{overallTotal}</div>
          <div className="text-xs text-slate-400 mt-1">Web &amp; Desktop apps</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Rating Distribution</div>
          <div className="space-y-1 mt-2 text-xs">
            {[5, 4, 3, 2, 1].map((r) => (
              <div key={r} className="flex items-center gap-2">
                <span className="w-6 text-slate-400 font-medium">{r}★</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${overallTotal > 0 ? ((dist[r] || 0) / overallTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-slate-400 font-mono text-[11px]">{dist[r] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== FILTERS ==================== */}
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Rating Filter</label>
            <select
              value={ratingFilter}
              onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars (★ ★ ★ ★ ★)</option>
              <option value="4">4 Stars (★ ★ ★ ★)</option>
              <option value="3">3 Stars (★ ★ ★)</option>
              <option value="2">2 Stars (★ ★)</option>
              <option value="1">1 Star (★)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="feature">✨ Feature Request</option>
              <option value="ux">🎨 UX &amp; Design</option>
              <option value="bug">🐞 Bug Report</option>
              <option value="performance">⚡ Speed &amp; AI Quality</option>
              <option value="other">💬 General</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing {items.length} of {totalItems} matching entries
        </div>
      </div>

      {/* ==================== FEEDBACK LIST ==================== */}
      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">💬</div>
          <h3 className="text-lg font-bold text-white mb-1">No Feedback Entries Yet</h3>
          <p className="text-xs text-slate-400">Customer feedback submitted from the website or desktop app will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {items.map((fb) => (
            <div key={fb.id} className="card hover:border-slate-700 transition-all p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-amber-400 text-sm tracking-wide">
                    {'★'.repeat(fb.rating)}
                    <span className="text-slate-700">{'★'.repeat(5 - fb.rating)}</span>
                  </div>

                  <span className={`badge ${CATEGORY_BADGES[fb.category] || 'badge-slate'} text-xs`}>
                    {CATEGORY_LABELS[fb.category] || fb.category}
                  </span>

                  <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {fb.platform || 'web'}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  {fb.createdAt ? new Date(fb.createdAt).toLocaleString() : '—'}
                </div>
              </div>

              <p className="text-sm text-slate-200 leading-relaxed my-2 whitespace-pre-wrap">
                {fb.message}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5 mt-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-300">{fb.userName || 'Anonymous User'}</span>
                  {fb.userEmail && <span className="text-slate-500">&lt;{fb.userEmail}&gt;</span>}
                </div>
                {fb.userId && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    UID: {fb.userId.slice(0, 10)}…
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== PAGINATION ==================== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between card py-3 px-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-xs text-slate-400 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </AdminShell>
  );
}
