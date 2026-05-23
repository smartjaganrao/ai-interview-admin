'use client';

import { useState, useEffect } from 'react';

interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetUserEmail: string;
  details: any;
  timestamp: number;
  ipAddress: string;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');

  const pageSize = 50;

  // Fetch audit logs
  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        action: actionFilter,
        admin: adminFilter,
      });

      const response = await fetch(`/api/audit/logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data: AuditResponse = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [actionFilter, adminFilter]);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, adminFilter]);

  const actionBadgeColor = (action: string) => {
    switch (action) {
      case 'user_upgrade':
        return 'bg-blue-900 text-blue-200';
      case 'user_ban':
        return 'bg-red-900 text-red-200';
      case 'quota_reset':
        return 'bg-yellow-900 text-yellow-200';
      case 'content_delete':
        return 'bg-orange-900 text-orange-200';
      case 'subscription_extend':
        return 'bg-green-900 text-green-200';
      case 'refund_issued':
        return 'bg-purple-900 text-purple-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  const downloadCSV = async () => {
    try {
      // Create CSV header
      const headers = [
        'Admin Email',
        'Action',
        'Target User Email',
        'Details',
        'Timestamp',
        'IP Address',
      ];

      // Create CSV rows
      const rows = logs.map((log) => [
        log.adminEmail,
        log.action,
        log.targetUserEmail,
        JSON.stringify(log.details),
        new Date(log.timestamp).toISOString(),
        log.ipAddress,
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) =>
              typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
            )
            .join(',')
        ),
      ].join('\n');

      // Download as file
      const element = document.createElement('a');
      element.setAttribute(
        'href',
        'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
      );
      element.setAttribute('download', `audit-logs-${Date.now()}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
          <p className="mt-2 text-gray-400">
            Admin action history ({total.toLocaleString()} total)
          </p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={logs.length === 0}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Filter by Action
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Actions</option>
            <option value="user_upgrade">User Upgrade</option>
            <option value="user_ban">User Ban</option>
            <option value="quota_reset">Quota Reset</option>
            <option value="content_delete">Content Delete</option>
            <option value="subscription_extend">Subscription Extend</option>
            <option value="refund_issued">Refund Issued</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">
            Filter by Admin Email
          </label>
          <input
            type="text"
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            placeholder="Search admin email..."
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
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
            <p className="text-gray-400">Loading audit logs...</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
          <p className="text-gray-400">No audit logs found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Admin Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Action
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Target User
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4 text-sm text-white">
                    {log.adminEmail}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${actionBadgeColor(
                        log.action
                      )}`}
                    >
                      {log.action
                        .replace(/_/g, ' ')
                        .split(' ')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {log.targetUserEmail || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(log.timestamp).toLocaleDateString()} at{' '}
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {log.ipAddress}
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
