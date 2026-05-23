'use client';

import { useState, useEffect } from 'react';

interface ModerationMessage {
  id: string;
  sessionId: string;
  userId: string;
  question: string;
  answer: string;
  flagged: boolean;
  flagReason: string;
  flagStatus: string;
  createdAt: number;
}

interface ModerationResponse {
  messages: ModerationMessage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export default function ModerationPage() {
  const [messages, setMessages] = useState<ModerationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ModerationMessage | null>(
    null
  );

  const pageSize = 20;

  // Fetch moderation queue
  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        status: statusFilter,
      });

      const response = await fetch(`/api/moderation/messages?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch moderation queue');
      }

      const data: ModerationResponse = await response.json();
      setMessages(data.messages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load moderation queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchMessages();
  }, [page, statusFilter]);

  const handleDeleteMessage = async (messageId: string, reason: string) => {
    if (!confirm(`Delete this message? Reason: ${reason}`)) return;

    setDeletingId(messageId);
    try {
      const response = await fetch(
        `/api/moderation/messages/${messageId}/delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      // Refresh list
      await fetchMessages();
      setSelectedMessage(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete message');
    } finally {
      setDeletingId(null);
    }
  };

  const flagReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case 'spam':
        return 'bg-orange-900 text-orange-200';
      case 'abuse':
        return 'bg-red-900 text-red-200';
      case 'misinformation':
        return 'bg-yellow-900 text-yellow-200';
      case 'copyrighted':
        return 'bg-purple-900 text-purple-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Content Moderation</h1>
        <p className="mt-2 text-gray-400">
          Review and manage flagged content ({total.toLocaleString()} total)
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300">
          Filter by Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="mt-1 w-full max-w-sm rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none md:max-w-xs"
        >
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="deleted">Deleted</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-600 bg-red-900 bg-opacity-20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500"></div>
            <p className="text-gray-400">Loading moderation queue...</p>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
          <p className="text-gray-400">No flagged content to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-lg border border-gray-700 bg-gray-800 p-6 hover:border-gray-600"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${flagReasonBadgeColor(
                        message.flagReason
                      )}`}
                    >
                      {message.flagReason.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(message.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-white">
                    Q: {message.question}
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    A: {message.answer.substring(0, 150)}
                    {message.answer.length > 150 ? '...' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMessage(message)}
                  className="ml-4 rounded px-3 py-1 text-xs font-medium text-blue-400 hover:bg-gray-700"
                >
                  View
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleDeleteMessage(message.id, message.flagReason)
                  }
                  disabled={deletingId === message.id}
                  className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 md:flex-none"
                >
                  {deletingId === message.id ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1 rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 md:flex-none"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && total > pageSize && (
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Page {page} of {Math.ceil(total / pageSize)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= total}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-96 w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-600 bg-gray-900 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Message Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400">
                  QUESTION
                </label>
                <p className="mt-1 text-white">{selectedMessage.question}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400">
                  ANSWER
                </label>
                <p className="mt-1 max-h-32 overflow-y-auto rounded bg-gray-800 p-3 text-gray-300">
                  {selectedMessage.answer}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400">
                    FLAG REASON
                  </label>
                  <p className="mt-1 text-white">{selectedMessage.flagReason}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400">
                    USER ID
                  </label>
                  <p className="mt-1 font-mono text-xs text-gray-400">
                    {selectedMessage.userId}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() =>
                  handleDeleteMessage(selectedMessage.id, selectedMessage.flagReason)
                }
                className="flex-1 rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
              >
                Delete Message
              </button>
              <button
                onClick={() => setSelectedMessage(null)}
                className="flex-1 rounded bg-gray-700 px-4 py-2 font-medium text-white hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
