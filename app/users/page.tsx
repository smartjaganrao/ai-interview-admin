'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useAdminData, dataSourceLabel } from '@/lib/useAdminData';

interface User {
  uid: string; email: string; name: string;
  plan: 'free' | 'pro' | 'power'; status: 'active' | 'inactive' | 'banned';
  joined: string; lastActive: string; questions: number;
}
interface ApiUser { id: string; email: string; name: string; plan: 'free'|'pro'|'power'; createdAt: number; }

const DEMO: User[] = [
  { uid:'1', email:'alice@example.com', name:'Alice Chen', plan:'pro', status:'active', joined:'2026-01-15', lastActive:'2 min ago', questions:342 },
  { uid:'2', email:'bob@example.com', name:'Bob Smith', plan:'free', status:'active', joined:'2026-02-10', lastActive:'1 hr ago', questions:28 },
  { uid:'3', email:'charlie@example.com', name:'Charlie Davis', plan:'power', status:'active', joined:'2026-01-20', lastActive:'5 min ago', questions:891 },
  { uid:'4', email:'diana@example.com', name:'Diana Prince', plan:'free', status:'inactive', joined:'2025-12-01', lastActive:'3 weeks ago', questions:12 },
  { uid:'5', email:'evan@example.com', name:'Evan Wright', plan:'pro', status:'active', joined:'2026-03-05', lastActive:'1 day ago', questions:156 },
  { uid:'6', email:'fiona@example.com', name:'Fiona Gallagher', plan:'power', status:'active', joined:'2026-02-22', lastActive:'30 min ago', questions:523 },
];

const PLAN_BADGE: Record<string, string> = { free:'badge-slate', pro:'badge-indigo', power:'badge-purple' };
const STATUS_BADGE: Record<string, string> = { active:'badge-green', inactive:'badge-slate', banned:'badge-red' };

function UserAvatar({ name }: { name: string }) {
  const colors = ['#6366F1','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="avatar" style={{ background: color }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<User | null>(null);

  const { data: users, reason } = useAdminData<User[]>(
    '/api/users/list?limit=100', DEMO,
    (json) => {
      const arr = ((json as { users?: ApiUser[] }).users) || [];
      return arr.map((u) => ({
        uid: u.id, email: u.email, name: u.name || u.email?.split('@')[0] || 'User',
        plan: u.plan || 'free', status: 'active' as const,
        joined: u.createdAt ? new Date(u.createdAt).toISOString().slice(0,10) : '—',
        lastActive: '—', questions: 0,
      }));
    }
  );
  const badge = dataSourceLabel(reason);

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      (u.email.toLowerCase().includes(s) || u.name.toLowerCase().includes(s)) &&
      (planFilter === 'all' || u.plan === planFilter) &&
      (statusFilter === 'all' || u.status === statusFilter)
    );
  });

  const toggle = (uid: string) =>
    setSelected((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);
  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map((u) => u.uid));

  const counts = {
    total: users.length, active: users.filter((u) => u.status === 'active').length,
    paid: users.filter((u) => u.plan !== 'free').length, banned: users.filter((u) => u.status === 'banned').length,
  };

  return (
    <AdminShell title="Users">
      {/* Data source */}
      <div className="mb-4">
        <span className={`badge ${badge.className}`}>{badge.text}</span>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Users', value: counts.total, icon: 'blue' },
          { label: 'Active', value: counts.active, icon: 'green' },
          { label: 'Paid', value: counts.paid, icon: 'purple' },
          { label: 'Banned', value: counts.banned, icon: 'orange' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="input-group" style={{ width: 280 }}>
          <svg className="input-group-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <select className="input" style={{ width: 130 }} value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="power">Power</option>
        </select>
        <select className="input" style={{ width: 130 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="banned">Banned</option>
        </select>

        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">{selected.length} selected</span>
            <button className="btn btn-secondary btn-sm">Upgrade</button>
            <button className="btn btn-secondary btn-sm">Email</button>
            <button className="btn btn-danger btn-sm">Ban</button>
          </div>
        )}

        <div className="filter-bar-right">
          <button className="btn btn-secondary btn-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-flat">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll}/>
                </th>
                <th>User</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Last Active</th>
                <th>Joined</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.uid}>
                  <td><input type="checkbox" checked={selected.includes(u.uid)} onChange={() => toggle(u.uid)}/></td>
                  <td>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.name}/>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-sm text-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${PLAN_BADGE[u.plan]}`}>{u.plan.toUpperCase()}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[u.status]}`}>{u.status}</span></td>
                  <td className="text-muted">{u.questions}</td>
                  <td className="text-muted">{u.lastActive}</td>
                  <td className="text-muted">{u.joined}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => setDetail(u)}>View</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-text">No users match your filters</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {users.length} users
        </div>
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="drawer-overlay" onClick={() => setDetail(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title">User Details</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Profile */}
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>
                {detail.name.charAt(0).toUpperCase()}
              </div>
              <div className="font-semibold" style={{ fontSize: 15, marginBottom: 2 }}>{detail.name}</div>
              <div className="text-muted text-sm">{detail.email}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`badge ${PLAN_BADGE[detail.plan]}`}>{detail.plan.toUpperCase()}</span>
                <span className={`badge ${STATUS_BADGE[detail.status]}`}>{detail.status}</span>
              </div>
            </div>

            <div className="divider"/>

            {/* Info */}
            <div>
              {[
                { label: 'User ID', value: detail.uid },
                { label: 'Questions Practiced', value: detail.questions },
                { label: 'Last Active', value: detail.lastActive },
                { label: 'Member Since', value: detail.joined },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-muted text-sm">{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div>
              <div className="text-sm font-semibold mb-2">Actions</div>
              <select className="input mb-2">
                <option>Change Plan…</option>
                <option>Free</option>
                <option>Pro</option>
                <option>Power</option>
              </select>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-primary w-full">Apply Plan Change</button>
                <button className="btn btn-secondary w-full">Reset Usage Quota</button>
                <button className="btn btn-danger w-full">
                  {detail.status === 'banned' ? 'Unban User' : 'Ban User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
