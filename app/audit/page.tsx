'use client';

import Link from 'next/link';

export default function AuditPage() {
  const logs = [
    { id: 1, admin: 'admin@company.com', action: 'user_upgrade', target: 'alice@example.com', details: 'Free → Pro', timestamp: '2026-05-24 14:30', ip: '192.168.1.1' },
    { id: 2, admin: 'admin@company.com', action: 'quota_reset', target: 'bob@example.com', details: 'Reset tokens', timestamp: '2026-05-24 13:15', ip: '192.168.1.1' },
    { id: 3, admin: 'admin@company.com', action: 'user_ban', target: 'spammer@example.com', details: 'Spam detected', timestamp: '2026-05-24 11:45', ip: '192.168.1.1' },
    { id: 4, admin: 'admin@company.com', action: 'user_upgrade', target: 'charlie@example.com', details: 'Pro → Power', timestamp: '2026-05-23 16:20', ip: '192.168.1.1' },
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
                  item.href === '/audit' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'
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
          <h1 className="text-3xl font-bold text-white mb-8">Audit Logs</h1>

          <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900/50">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Admin</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Action</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Target</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Details</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Timestamp</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 text-sm text-white">{log.admin}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-semibold">
                        {log.action.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white">{log.target}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{log.details}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{log.timestamp}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-slate-400 text-sm">{logs.length} audit logs</p>
            <button className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-white text-sm font-semibold">
              📥 Export Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
