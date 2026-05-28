'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';

interface User {
  uid: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'power';
  status: 'active' | 'inactive' | 'banned';
  joined: string;
  lastActive: string;
  questions: number;
}

const ALL_USERS: User[] = [
  { uid: '1', email: 'alice@example.com', name: 'Alice Chen', plan: 'pro', status: 'active', joined: '2026-01-15', lastActive: '2 min ago', questions: 342 },
  { uid: '2', email: 'bob@example.com', name: 'Bob Smith', plan: 'free', status: 'active', joined: '2026-02-10', lastActive: '1 hour ago', questions: 28 },
  { uid: '3', email: 'charlie@example.com', name: 'Charlie Davis', plan: 'power', status: 'active', joined: '2026-01-20', lastActive: '5 min ago', questions: 891 },
  { uid: '4', email: 'diana@example.com', name: 'Diana Prince', plan: 'free', status: 'inactive', joined: '2025-12-01', lastActive: '3 weeks ago', questions: 12 },
  { uid: '5', email: 'evan@example.com', name: 'Evan Wright', plan: 'pro', status: 'active', joined: '2026-03-05', lastActive: '1 day ago', questions: 156 },
  { uid: '6', email: 'fiona@example.com', name: 'Fiona Gallagher', plan: 'power', status: 'active', joined: '2026-02-22', lastActive: '30 min ago', questions: 523 },
  { uid: '7', email: 'spammer@example.com', name: 'Spam Account', plan: 'free', status: 'banned', joined: '2026-05-01', lastActive: 'banned', questions: 3 },
];

const planBadge = { free: 'badge-slate', pro: 'badge-indigo', power: 'badge-purple' };
const statusBadge = { active: 'badge-green', inactive: 'badge-slate', banned: 'badge-red' };

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const filtered = ALL_USERS.filter((u) => {
    const s = search.toLowerCase();
    const matchSearch = u.email.toLowerCase().includes(s) || u.name.toLowerCase().includes(s);
    const matchPlan = planFilter === 'all' || u.plan === planFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  const toggleSelect = (uid: string) =>
    setSelected((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));

  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map((u) => u.uid));

  return (
    <AdminShell title="Users Management">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: ALL_USERS.length, color: 'badge-indigo' },
          { label: 'Active', value: ALL_USERS.filter((u) => u.status === 'active').length, color: 'badge-green' },
          { label: 'Paid', value: ALL_USERS.filter((u) => u.plan !== 'free').length, color: 'badge-purple' },
          { label: 'Banned', value: ALL_USERS.filter((u) => u.status === 'banned').length, color: 'badge-red' },
        ].map((s, i) => (
          <div key={i} className="card py-4">
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="input md:w-40">
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="power">Power</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input md:w-40">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="banned">Banned</option>
          </select>
          <button className="btn btn-secondary">📥 Export CSV</button>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
            <span className="text-sm text-slate-300">{selected.length} selected</span>
            <button className="btn btn-sm btn-secondary">Upgrade</button>
            <button className="btn btn-sm btn-secondary">Email</button>
            <button className="btn btn-sm btn-danger">Ban</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-12">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                <th>User</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Last Active</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.uid}>
                  <td>
                    <input type="checkbox" checked={selected.includes(u.uid)} onChange={() => toggleSelect(u.uid)} className="rounded" />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-white">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-medium">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${planBadge[u.plan]}`}>{u.plan.toUpperCase()}</span></td>
                  <td><span className={`badge ${statusBadge[u.status]}`}>{u.status}</span></td>
                  <td className="text-slate-300">{u.questions}</td>
                  <td className="text-slate-400 text-sm">{u.lastActive}</td>
                  <td className="text-slate-400 text-sm">{u.joined}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => setDetailUser(u)} className="btn btn-sm btn-secondary">View</button>
                      <button className="btn btn-sm btn-ghost">⋯</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">No users match your filters</div>
        )}
      </div>

      <p className="text-slate-400 text-sm mt-4">
        Showing {filtered.length} of {ALL_USERS.length} users
      </p>

      {/* User Detail Drawer */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetailUser(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-md h-full glass-heavy p-6 overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">User Details</h2>
              <button onClick={() => setDetailUser(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3">
                {detailUser.name.charAt(0)}
              </div>
              <div className="text-xl font-bold text-white">{detailUser.name}</div>
              <div className="text-slate-400">{detailUser.email}</div>
              <div className="flex justify-center gap-2 mt-3">
                <span className={`badge ${planBadge[detailUser.plan]}`}>{detailUser.plan.toUpperCase()}</span>
                <span className={`badge ${statusBadge[detailUser.status]}`}>{detailUser.status}</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { label: 'User ID', value: detailUser.uid },
                { label: 'Questions Practiced', value: detailUser.questions },
                { label: 'Last Active', value: detailUser.lastActive },
                { label: 'Member Since', value: detailUser.joined },
              ].map((row, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 text-sm">{row.label}</span>
                  <span className="text-white text-sm font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-300">Actions</div>
              <select className="input">
                <option>Change Plan...</option>
                <option>Free</option>
                <option>Pro</option>
                <option>Power</option>
              </select>
              <button className="btn btn-primary w-full">Apply Plan Change</button>
              <button className="btn btn-secondary w-full">Reset Quota</button>
              <button className="btn btn-danger w-full">
                {detailUser.status === 'banned' ? 'Unban User' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
