'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const users = [
    { uid: '1', email: 'alice@example.com', name: 'Alice', plan: 'pro', status: 'active', joined: '2026-01-15' },
    { uid: '2', email: 'bob@example.com', name: 'Bob', plan: 'free', status: 'active', joined: '2026-02-10' },
    { uid: '3', email: 'charlie@example.com', name: 'Charlie', plan: 'power', status: 'active', joined: '2026-01-20' },
    { uid: '4', email: 'diana@example.com', name: 'Diana', plan: 'free', status: 'inactive', joined: '2025-12-01' },
  ];

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.includes(search) || u.name.includes(search);
    const matchesFilter = filter === 'all' || u.plan === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-slate-900 border-r border-slate-800">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"></div>
            <span className="text-lg font-bold text-white">Admin Panel</span>
          </div>

          <nav className="space-y-2">
            {[
              { label: 'Dashboard', href: '/', icon: '📊' },
              { label: 'Users', href: '/users', icon: '👥' },
              { label: 'Analytics', href: '/analytics', icon: '📈' },
              { label: 'Audit Logs', href: '/audit', icon: '📋' },
              { label: 'Support', href: '/support', icon: '💬' },
              { label: 'Settings', href: '/settings', icon: '⚙️' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition text-slate-300 ${
                  item.href === '/users' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <Link
            href="/login"
            className="w-full py-2 px-4 rounded-lg border border-slate-700 text-sm text-center text-slate-300 hover:text-white hover:border-slate-600 transition"
          >
            Sign Out
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Users Management</h1>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="power">Power</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900/50">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Plan</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Joined</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 text-sm text-white">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-white">{user.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                        user.plan === 'power' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-slate-700/50 text-slate-300'
                      }`}>
                        {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{user.joined}</td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 transition text-white text-xs font-semibold">
                        Upgrade
                      </button>
                      <button className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 transition text-white text-xs font-semibold">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-slate-400 text-sm mt-4">{filteredUsers.length} users found</p>
        </div>
      </div>
    </div>
  );
}
