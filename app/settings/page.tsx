'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';

const ADMINS = [
  { uid:'1', email:'admin@company.com', role:'super-admin', since:'2026-01-01' },
  { uid:'2', email:'mod@company.com', role:'moderator', since:'2026-02-15' },
  { uid:'3', email:'analyst@company.com', role:'analyst', since:'2026-03-20' },
];
const API_KEYS = [
  { id:'1', name:'Analytics API', scopes:'read-only', created:'2026-03-10', lastUsed:'2026-05-27', status:'active' },
  { id:'2', name:'Bulk Operations', scopes:'read-write', created:'2026-02-01', lastUsed:'2026-05-20', status:'active' },
];

const ROLE_BADGE: Record<string,string> = { 'super-admin':'badge-purple', moderator:'badge-indigo', analyst:'badge-slate' };

export default function SettingsPage() {
  const [tab, setTab] = useState<'org'|'admins'|'apikeys'>('org');
  const [invite, setInvite] = useState('');

  return (
    <AdminShell title="Settings">
      <div className="tabs">
        {[{id:'org',label:'Organization'},{id:'admins',label:'Admin Users'},{id:'apikeys',label:'API Keys'}].map((t) => (
          <button key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={() => setTab(t.id as typeof tab)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 720 }}>
        {/* Organization */}
        {tab === 'org' && (
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <div className="font-semibold mb-4" style={{ fontSize:14 }}>Organization Settings</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[
                  { label:'Company Name', type:'text', defaultValue:'AI Interview Helper' },
                  { label:'Support Email', type:'email', defaultValue:'support@aiinterview.com' },
                ].map((f,i) => (
                  <div key={i}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>{f.label}</label>
                    <input type={f.type} defaultValue={f.defaultValue} className="input"/>
                  </div>
                ))}
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>Default Currency</label>
                  <select className="input">
                    <option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <button className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        )}

        {/* Admin Users */}
        {tab === 'admins' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card">
              <div className="font-semibold mb-3" style={{ fontSize:14 }}>Invite New Admin</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <input type="email" placeholder="email@company.com" value={invite} onChange={(e) => setInvite(e.target.value)} className="input" style={{ flex:1, minWidth:200 }}/>
                <select className="input" style={{ width:140 }}>
                  <option>Admin</option><option>Moderator</option><option>Analyst</option>
                </select>
                <button className="btn btn-primary">Send Invite</button>
              </div>
            </div>

            <div className="card-flat">
              <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', fontSize:14, fontWeight:600 }}>
                Current Admins
              </div>
              {ADMINS.map((a) => (
                <div key={a.uid} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                  <div className="avatar">{a.email.charAt(0).toUpperCase()}</div>
                  <div style={{ flex:1 }}>
                    <div className="font-medium">{a.email}</div>
                    <div className="text-sm text-muted">Invited {a.since}</div>
                  </div>
                  <span className={`badge ${ROLE_BADGE[a.role]||'badge-slate'}`}>{a.role.replace('-',' ')}</span>
                  {a.role !== 'super-admin' && <button className="btn btn-danger btn-sm">Remove</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Keys */}
        {tab === 'apikeys' && (
          <div className="card-flat">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
              <div className="font-semibold" style={{ fontSize:14 }}>API Keys</div>
              <button className="btn btn-primary btn-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Generate Key
              </button>
            </div>
            {API_KEYS.map((k) => (
              <div key={k.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ flex:1 }}>
                  <div className="font-medium">{k.name}</div>
                  <div className="text-sm text-muted">Scopes: {k.scopes} · Last used: {k.lastUsed}</div>
                </div>
                <span className="badge badge-green">{k.status}</span>
                <button className="btn btn-danger btn-sm">Revoke</button>
              </div>
            ))}
            <div style={{ padding:'12px 16px' }}>
              <div className="alert alert-warning">
                <strong>Warning:</strong> API keys grant programmatic access. Keep them secret and revoke unused keys.
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
