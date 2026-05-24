'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SettingsPage() {
  const [email, setEmail] = useState('');

  const admins = [
    { uid: '1', email: 'admin@company.com', role: 'super-admin', invited: '2026-01-01' },
    { uid: '2', email: 'moderator@company.com', role: 'moderator', invited: '2026-02-15' },
  ];

  const apiKeys = [
    { id: '1', name: 'Analytics API', scopes: 'read-only', created: '2026-03-10', lastUsed: '2026-05-24', status: 'active' },
    { id: '2', name: 'Bulk Operations', scopes: 'write', created: '2026-02-01', lastUsed: '2026-05-20', status: 'active' },
  ];

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
                  item.href === '/settings' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

          {/* Organization Settings */}
          <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Organization</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                <input
                  type="text"
                  defaultValue="AI Interview Helper"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Support Email</label>
                <input
                  type="email"
                  defaultValue="support@aiinterview.com"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white font-semibold">
                Save Changes
              </button>
            </div>
          </div>

          {/* Admin Management */}
          <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Admin Users</h2>

            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter email to invite..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <select className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500">
                  <option>Admin</option>
                  <option>Moderator</option>
                  <option>Analyst</option>
                </select>
                <button className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white font-semibold">
                  Invite
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin.uid} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{admin.email}</p>
                    <p className="text-slate-400 text-sm">{admin.role.replace('-', ' ').toUpperCase()} • Invited {admin.invited}</p>
                  </div>
                  <button className="px-3 py-1 rounded text-xs font-semibold text-red-400 hover:bg-red-500/20 transition">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* API Keys */}
          <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/50">
            <h2 className="text-xl font-semibold text-white mb-4">API Keys</h2>

            <button className="mb-6 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white font-semibold">
              + Generate New Key
            </button>

            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-800">
                  <div className="flex-1">
                    <p className="text-white font-medium">{key.name}</p>
                    <p className="text-slate-400 text-sm">Scopes: {key.scopes} • Last used: {key.lastUsed}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                      {key.status}
                    </span>
                    <button className="px-3 py-1 rounded text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition">
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
