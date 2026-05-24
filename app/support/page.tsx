'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SupportPage() {
  const [filter, setFilter] = useState('open');

  const tickets = [
    { id: 1, title: 'Cannot login with Google', user: 'alice@example.com', status: 'open', priority: 'high', created: '2026-05-24', assigned: 'admin@company.com' },
    { id: 2, title: 'Feature request: dark mode', user: 'bob@example.com', status: 'open', priority: 'medium', created: '2026-05-23', assigned: null },
    { id: 3, title: 'Billing issue - double charge', user: 'charlie@example.com', status: 'in-progress', priority: 'critical', created: '2026-05-22', assigned: 'admin@company.com' },
    { id: 4, title: 'Need refund for March', user: 'diana@example.com', status: 'resolved', priority: 'medium', created: '2026-05-20', assigned: 'admin@company.com' },
  ];

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

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
                  item.href === '/support' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'
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
          <h1 className="text-3xl font-bold text-white mb-8">Support Tickets</h1>

          <div className="flex gap-4 mb-6">
            {['open', 'in-progress', 'resolved', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg transition text-sm font-semibold ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filtered.map((ticket) => (
              <div key={ticket.id} className="p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{ticket.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        ticket.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                        ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">From: {ticket.user}</p>
                  </div>

                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      ticket.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                      ticket.status === 'in-progress' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {ticket.status.replace('-', ' ').toUpperCase()}
                    </span>
                    <p className="text-slate-400 text-xs mt-2">{ticket.created}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-slate-400 text-sm">Assigned: {ticket.assigned || 'Unassigned'}</p>
                  <button className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 transition text-white text-xs font-semibold">
                    View Ticket
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
