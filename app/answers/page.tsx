'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData } from '@/lib/useAdminData';
import { postAdmin } from '@/lib/adminActions';
import { Loader, ErrorState, RefreshBar } from '@/components/DataStates';

interface AiAnswer {
  id: string;
  sessionId: string;
  userId: string;
  question: string;
  answer: string;
  confidence: number | null;
  difficulty: string | null;
  createdAt: number;
}

export default function AnswersPage() {
  const [page, setPage] = useState(1);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [sessionIdFilter, setSessionIdFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [detail, setDetail] = useState<AiAnswer | null>(null);

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (userIdFilter.trim()) params.set('userId', userIdFilter.trim());
    if (sessionIdFilter.trim()) params.set('sessionId', sessionIdFilter.trim());
    return `/api/answers?${params.toString()}`;
  };

  const { data, loading, reason, refetch, dataUpdatedAt } = useAdminData<{ messages: AiAnswer[]; total: number; hasMore: boolean }>(
    buildUrl(),
    { messages: [], total: 0, hasMore: false },
    (json) => {
      const j = json as { messages?: AiAnswer[]; total?: number; hasMore?: boolean };
      return {
        messages: j.messages || [],
        total: j.total || 0,
        hasMore: j.hasMore || false,
      };
    }
  );

  const shouldGate = loading || reason === 'unauthorized' || reason === 'not-configured';
  const hasCached = reason === 'error' && data.messages.length > 0;

  if (shouldGate) {
    if (reason === 'unauthorized' || reason === 'not-configured') {
      return <AdminShell title="AI Answers" subtitle="View and delete cloud AI interview answers"><ErrorState reason={reason} onRetry={refetch} /></AdminShell>;
    }
    return <AdminShell title="AI Answers" subtitle="View and delete cloud AI interview answers"><Loader label="Loading AI answers…" /></AdminShell>;
  }

  const flash = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  };

  const deleteAnswer = async (answer: AiAnswer) => {
    if (!window.confirm(`Delete this AI answer?\n\nQ: ${answer.question.substring(0, 100)}...\n\nThis cannot be undone.`)) return;
    setDeletingId(answer.id);
    const r = await postAdmin(`/api/answers/${answer.id}/delete`, {});
    setDeletingId(null);
    if (r.ok) {
      flash('ok', 'Answer deleted');
      setDetail(null);
      refetch();
    } else {
      flash('err', r.error || 'Delete failed');
    }
  };

  const applyFilters = () => {
    setPage(1);
    refetch();
  };

  return (
    <AdminShell title="AI Answers" subtitle="View and delete cloud AI interview answers">
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

      {/* Filters */}
      <div className="card-flat" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>User ID</label>
            <input
              className="input"
              placeholder="Filter by userId..."
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Session ID</label>
            <input
              className="input"
              placeholder="Filter by sessionId..."
              value={sessionIdFilter}
              onChange={(e) => setSessionIdFilter(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={applyFilters} style={{ marginBottom: 1 }}>
            Apply Filters
          </button>
          <button className="btn btn-secondary" onClick={() => { setUserIdFilter(''); setSessionIdFilter(''); setPage(1); }} style={{ marginBottom: 1 }}>
            Clear
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          Showing {data.messages.length} of {data.total} answers
        </div>
      </div>

      {/* Answers Table */}
      <div className="card-flat">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>User ID</th>
                <th>Session ID</th>
                <th>Question</th>
                <th>Answer Preview</th>
                <th>Difficulty</th>
                <th>Confidence</th>
                <th>Created</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.messages.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-state-text">No AI answers found</div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.messages.map((msg, idx) => (
                  <tr key={msg.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(msg)}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                      {(page - 1) * 20 + idx + 1}
                    </td>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        {msg.userId.substring(0, 20)}...
                      </div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        {msg.sessionId.substring(0, 20)}...
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={msg.question}>
                        {msg.question || '(no question)'}
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }} title={msg.answer}>
                        {msg.answer || '(no answer)'}
                      </div>
                    </td>
                    <td>
                      {msg.difficulty ? (
                        <span className={`badge ${msg.difficulty === 'advanced' ? 'badge-red' : msg.difficulty === 'intermediate' ? 'badge-yellow' : 'badge-green'}`}>
                          {msg.difficulty}
                        </span>
                      ) : (
                        <span className="badge badge-slate">—</span>
                      )}
                    </td>
                    <td>
                      {msg.confidence !== null ? (
                        <span className="badge badge-indigo">{Math.round(msg.confidence * 100)}%</span>
                      ) : (
                        <span className="badge badge-slate">—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '—'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={deletingId === msg.id}
                        onClick={() => deleteAnswer(msg)}
                      >
                        {deletingId === msg.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Page {page} of {data.total > 0 ? Math.ceil(data.total / 20) : 1}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button className="btn btn-secondary btn-sm" disabled={!data.hasMore} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {detail && (
        <div className="drawer-overlay" onClick={() => setDetail(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">AI Answer Detail</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>User ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 12, wordBreak: 'break-all' }}>{detail.userId}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Session ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 12, wordBreak: 'break-all' }}>{detail.sessionId}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Created</div>
              <div style={{ fontSize: 13, marginBottom: 12 }}>{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}</div>
              {detail.difficulty && (
                <div style={{ marginBottom: 12 }}>
                  <span className={`badge ${detail.difficulty === 'advanced' ? 'badge-red' : detail.difficulty === 'intermediate' ? 'badge-yellow' : 'badge-green'}`}>
                    {detail.difficulty}
                  </span>
                </div>
              )}
              {detail.confidence !== null && (
                <div style={{ marginBottom: 12 }}>
                  <span className="badge badge-indigo">{Math.round(detail.confidence * 100)}% confidence</span>
                </div>
              )}
            </div>
            <div className="divider"/>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Question</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, padding: 10, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                {detail.question || '(no question)'}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Answer</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, padding: 10, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
                {detail.answer || '(no answer)'}
              </div>
            </div>
            <button
              className="btn btn-danger w-full"
              disabled={deletingId === detail.id}
              onClick={() => deleteAnswer(detail)}
            >
              {deletingId === detail.id ? 'Deleting…' : 'Delete This Answer'}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
