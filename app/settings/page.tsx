'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';

export default function SettingsPage() {
  const [tab, setTab] = useState<'org' | 'admins' | 'apikeys'>('org');
  const [inviteEmail, setInviteEmail] = useState('');

  const admins = [
    { uid: '1', email: 'admin@company.com', role: 'super-admin', invited: '2026-01-01' },
    { uid: '2', email: 'mod@company.com', role: 'moderator', invited: '2026-02-15' },
    { uid: '3', email: 'analyst@company.com', role: 'analyst', invited: '2026-03-20' },
  ];

  const apiKeys = [
    { id: '1', name: 'Analytics API', scopes: 'read-only', created: '2026-03-10', lastUsed: '2026-05-27', status: 'active' },
    { id: '2', name: 'Bulk Operations', scopes: 'read-write', created: '2026-02-01', lastUsed: '2026-05-20', status: 'active' },
  ];

  return (
    <AdminShell title="Settings">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10">
        {[
          { id: 'org', label: '🏢 Organization' },
          { id: 'admins', label: '👥 Admin Users' },
          { id: 'apikeys', label: '🔑 API Keys' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-3 font-medium transition-smooth border-b-2 ${
              tab === t.id ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl">
        {/* Organization */}
        {tab === 'org' && (
          <div className="card space-y-5">
            <h2 className="text-lg font-bold text-white">Organization Settings</h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
              <input type="text" defaultValue="AI Interview Helper" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Support Email</label>
              <input type="email" defaultValue="support@aiinterview.com" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Currency</label>
              <select className="input">
                <option>INR (₹)</option>
                <option>USD ($)</option>
                <option>EUR (€)</option>
              </select>
            </div>
            <button className="btn btn-primary">Save Changes</button>
          </div>
        )}

        {/* Admins */}
        {tab === 'admins' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-bold text-white mb-4">Invite New Admin</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="email@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input flex-1"
                />
                <select className="input sm:w-40">
                  <option>Admin</option>
                  <option>Moderator</option>
                  <option>Analyst</option>
                </select>
                <button className="btn btn-primary">Send Invite</button>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-white mb-4">Current Admins</h2>
              <div className="space-y-2">
                {admins.map((a) => (
                  <div key={a.uid} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-smooth">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-white">
                        {a.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{a.email}</div>
                        <div className="text-xs text-slate-400">Invited {a.invited}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`badge ${a.role === 'super-admin' ? 'badge-purple' : a.role === 'moderator' ? 'badge-indigo' : 'badge-slate'}`}>
                        {a.role.replace('-', ' ')}
                      </span>
                      {a.role !== 'super-admin' && <button className="btn btn-sm btn-danger">Remove</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Keys */}
        {tab === 'apikeys' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">API Keys</h2>
              <button className="btn btn-primary btn-sm">+ Generate Key</button>
            </div>
            <div className="space-y-3">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-white/5">
                  <div>
                    <div className="text-white font-medium">{k.name}</div>
                    <div className="text-xs text-slate-400">Scopes: {k.scopes} • Last used: {k.lastUsed}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge badge-green">{k.status}</span>
                    <button className="btn btn-sm btn-danger">Revoke</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
              ⚠️ API keys grant programmatic access. Keep them secret and revoke unused keys.
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
