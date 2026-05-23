'use client';

import { useState, useEffect } from 'react';

interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  assignedTo: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

interface TicketsResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('open');

  const pageSize = 20;

  // Fetch support tickets
  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        status: statusFilter,
      });

      const response = await fetch(`/api/support/tickets?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch support tickets');
      }

      const data: TicketsResponse = await response.json();
      setTickets(data.tickets);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter]);

  const priorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-900 text-red-200';
      case 'high':
        return 'bg-orange-900 text-orange-200';
      case 'medium':
        return 'bg-yellow-900 text-yellow-200';
      case 'low':
        return 'bg-green-900 text-green-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-900 text-blue-200';
      case 'in-progress':
        return 'bg-purple-900 text-purple-200';
      case 'resolved':
        return 'bg-green-900 text-green-200';
      case 'closed':
        return 'bg-gray-700 text-gray-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Support Tickets</h1>
        <p className="mt-2 text-gray-400">
          Inbox ({total.toLocaleString()} total)
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
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
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
            <p className="text-gray-400">Loading tickets...</p>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
          <p className="text-gray-400">No support tickets</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Messages
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    <a href={`#`} className="hover:text-blue-400">
                      {ticket.title}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {ticket.userEmail}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusBadgeColor(
                        ticket.status
                      )}`}
                    >
                      {ticket.status.charAt(0).toUpperCase() +
                        ticket.status.slice(1).replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${priorityBadgeColor(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority.charAt(0).toUpperCase() +
                        ticket.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {ticket.messageCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(ticket.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
