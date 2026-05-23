'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'power';
  createdAt: number;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('all');
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const pageSize = 50;

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        search,
        plan: selectedPlan,
      });

      const response = await fetch(`/api/users/list?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data: UsersResponse = await response.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1); // Reset to page 1 when search/filter changes
  }, [search, selectedPlan]);

  useEffect(() => {
    fetchUsers();
  }, [page, search, selectedPlan]);

  const handleUpgrade = async (userId: string, newPlan: string) => {
    setUpgrading(userId);
    try {
      const response = await fetch('/api/users/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPlan }),
      });

      if (!response.ok) {
        throw new Error('Failed to upgrade user');
      }

      // Refresh list
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade user');
    } finally {
      setUpgrading(null);
    }
  };

  const planBadgeColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-blue-900 text-blue-200';
      case 'power':
        return 'bg-purple-900 text-purple-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <p className="mt-2 text-gray-400">
          Manage {total} user accounts ({users.length} shown)
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-300">
            Search Email/Name
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">
            Filter by Plan
          </label>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="power">Power</option>
          </select>
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
            <p className="text-gray-400">Loading users...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
          <p className="text-gray-400">No users found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Plan
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4 text-sm text-white">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {user.name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${planBadgeColor(
                        user.plan
                      )}`}
                    >
                      {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleUpgrade(user.id, e.target.value);
                        }
                      }}
                      disabled={upgrading === user.id}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <option value="">Upgrade to...</option>
                      {user.plan !== 'free' && (
                        <option value="free">Free</option>
                      )}
                      {user.plan !== 'pro' && <option value="pro">Pro</option>}
                      {user.plan !== 'power' && (
                        <option value="power">Power</option>
                      )}
                    </select>
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
