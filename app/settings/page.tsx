'use client';

import { useState, useEffect } from 'react';
import AdminShell from '@/components/AdminShell';

const ROLE_BADGE: Record<string,string> = { 'super-admin':'badge-purple', moderator:'badge-indigo', analyst:'badge-slate' };

export default function SettingsPage() {
  const [tab, setTab] = useState<'org'|'aikeys'|'danger'>('aikeys');

  // ── Clear DB state ───────────────────────────────────────────────────────
  const [showClearModal, setShowClearModal] = useState(false);
  const [confirmText, setConfirmText]       = useState('');
  const [clearStatus, setClearStatus]       = useState<'idle'|'clearing'|'done'|'err'>('idle');
  const [clearResult, setClearResult]       = useState<{ total: number; results: Record<string,number> } | null>(null);
  const [clearError, setClearError]         = useState('');

  const openClearModal = () => { setConfirmText(''); setClearStatus('idle'); setClearResult(null); setClearError(''); setShowClearModal(true); };

  const runClearDb = async () => {
    if (confirmText !== 'DELETE ALL DATA') return;
    setClearStatus('clearing');
    try {
      const r = await fetch('/api/settings/clear-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirm: 'DELETE ALL DATA' }),
      });
      const data = await r.json();
      if (r.ok) {
        setClearStatus('done');
        setClearResult(data);
      } else {
        setClearStatus('err');
        setClearError(data.error || 'Failed');
      }
    } catch {
      setClearStatus('err');
      setClearError('Network error');
    }
  };

  // ── AI Keys tab state ────────────────────────────────────────────────────
  const [keyInfo, setKeyInfo]       = useState<{ groqKeySet:boolean; groqKeyMasked:string; updatedAt:number|null; updatedBy:string|null } | null>(null);
  const [newGroqKey, setNewGroqKey] = useState('');
  const [showKey, setShowKey]       = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'ok'|'err'>('idle');
  const [saveMsg, setSaveMsg]       = useState('');

  useEffect(() => {
    if (tab !== 'aikeys') return;
    fetch('/api/settings/api-keys', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setKeyInfo(d))
      .catch(() => {});
  }, [tab]);

  const saveGroqKey = async () => {
    if (!newGroqKey.trim()) return;
    setSaveStatus('saving');
    try {
      const r = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groqApiKey: newGroqKey.trim() }),
      });
      const data = await r.json();
      if (r.ok) {
        setSaveStatus('ok');
        setSaveMsg('Groq API key saved. All desktop users will use it immediately.');
        setNewGroqKey('');
        setShowKey(false);
        // Refresh the masked preview
        fetch('/api/settings/api-keys', { credentials: 'include' })
          .then(r2 => r2.ok ? r2.json() : null)
          .then(d => d && setKeyInfo(d))
          .catch(() => {});
      } else {
        setSaveStatus('err');
        setSaveMsg(data.error || 'Failed to save key');
      }
    } catch {
      setSaveStatus('err');
      setSaveMsg('Network error — try again');
    }
    setTimeout(() => setSaveStatus('idle'), 4000);
  };

  return (
    <AdminShell title="Settings" subtitle="API keys &amp; organization configuration">
      <div className="tabs">
        {[{id:'aikeys',label:'AI Keys'},{id:'org',label:'Organization'},{id:'danger',label:'⚠ Danger Zone'}].map((t) => (
          <button key={t.id} className={`tab${tab===t.id?' active':''}`}
            style={t.id==='danger' ? { color: tab==='danger' ? '#f87171' : '#f87171', opacity: tab==='danger' ? 1 : 0.7 } : {}}
            onClick={() => setTab(t.id as typeof tab)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 680 }}>

        {/* ── AI Keys ─────────────────────────────────────────────────── */}
        {tab === 'aikeys' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* How it works */}
            <div className="card" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <div className="font-semibold mb-2" style={{ fontSize: 13 }}>🔑 How the Groq key works</div>
              <div className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
                The Groq API key is stored server-side in Firestore and read by the JavihAI proxy on <strong>javihai.in</strong>.
                Desktop users <em>never</em> have the key — they sign in with their account, the proxy verifies their
                Firebase token, and AI responses stream back. Update the key here and all users benefit instantly,
                no app reinstall needed.
              </div>
            </div>

            {/* Current key */}
            <div className="card">
              <div className="font-semibold mb-4" style={{ fontSize: 14 }}>Current Groq Key</div>
              {keyInfo === null ? (
                <div className="text-muted text-sm">Loading…</div>
              ) : keyInfo.groqKeySet ? (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <code style={{ background:'var(--surface-2)', padding:'6px 12px', borderRadius:6, fontSize:13, flex:1, color:'var(--text)', letterSpacing:'0.05em' }}>
                      {keyInfo.groqKeyMasked}
                    </code>
                    <span className="badge badge-green">Active</span>
                  </div>
                  {keyInfo.updatedAt && (
                    <div className="text-sm text-muted">
                      Last updated {new Date(keyInfo.updatedAt).toLocaleString()} by {keyInfo.updatedBy}
                    </div>
                  )}
                </div>
              ) : (
                <div className="alert alert-warning" style={{ fontSize: 13 }}>
                  ⚠ No Groq key configured — AI features are disabled for all users. Add your key below.
                </div>
              )}
            </div>

            {/* Update key */}
            <div className="card">
              <div className="font-semibold mb-4" style={{ fontSize: 14 }}>
                {keyInfo?.groqKeySet ? 'Rotate / Update Key' : 'Add Groq API Key'}
              </div>
              <div className="text-sm text-muted mb-4">
                Get your key from{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                   style={{ color:'var(--primary-light)' }}>console.groq.com/keys</a>.
                It starts with <code>gsk_</code>.
              </div>

              <div style={{ display:'flex', gap:8, marginBottom: 12 }}>
                <div style={{ flex:1, position:'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                    value={newGroqKey}
                    onChange={(e) => setNewGroqKey(e.target.value)}
                    className="input"
                    style={{ paddingRight: 40 }}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => setShowKey(v => !v)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14 }}
                  >
                    {showKey ? '🙈' : '👁'}
                  </button>
                </div>
                <button
                  className="btn btn-primary"
                  disabled={saveStatus === 'saving' || !newGroqKey.trim()}
                  onClick={saveGroqKey}
                >
                  {saveStatus === 'saving' ? 'Saving…' : 'Save Key'}
                </button>
              </div>

              {saveStatus === 'ok' && (
                <div className="alert alert-success" style={{ fontSize: 13 }}>✓ {saveMsg}</div>
              )}
              {saveStatus === 'err' && (
                <div className="alert alert-warning" style={{ fontSize: 13 }}>⚠ {saveMsg}</div>
              )}

              <div className="text-sm text-muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
                🔒 The key is encrypted in Firestore. It is never returned to browsers — only the JavihAI
                server proxy reads it via the Admin SDK to make Groq API calls on behalf of signed-in users.
              </div>
            </div>
          </div>
        )}

        {/* ── Danger Zone ─────────────────────────────────────────────── */}
        {tab === 'danger' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card" style={{ border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.05)' }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#f87171', marginBottom:8 }}>⚠ Clear All Database Data</div>
              <div className="text-sm text-muted" style={{ lineHeight:1.7, marginBottom:16 }}>
                Deletes all <strong>user data</strong> — accounts, subscriptions, usage, referrals, creators, orders, and logs.
                <br />
                <span style={{ color:'#4ade80' }}>✓ Keeps:</span> Groq API key, pricing config, and plan settings.
                <br />
                <strong style={{ color:'#f87171' }}>This cannot be undone.</strong>
              </div>
              <button className="btn" onClick={openClearModal}
                style={{ background:'rgba(248,113,113,0.15)', color:'#f87171', border:'1px solid rgba(248,113,113,0.4)' }}>
                Clear All Data…
              </button>
            </div>
          </div>
        )}

        {/* ── Organization ────────────────────────────────────────────── */}
        {tab === 'org' && (
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <div className="font-semibold mb-4" style={{ fontSize:14 }}>Organization Settings</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[
                  { label:'Product Name', type:'text', defaultValue:'JavihAI' },
                  { label:'Support Email', type:'email', defaultValue:'support@javihai.in' },
                ].map((f,i) => (
                  <div key={i}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6 }}>{f.label}</label>
                    <input type={f.type} defaultValue={f.defaultValue} className="input"/>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" style={{ alignSelf:'flex-start' }}>Save Changes</button>
          </div>
        )}
      </div>
      {/* ── Clear DB Confirm Modal ───────────────────────────────────── */}
      {showClearModal && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ width:460, border:'1px solid rgba(248,113,113,0.4)', background:'var(--surface)' }}>
            {clearStatus === 'done' ? (
              <>
                <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>✅</div>
                <div style={{ fontWeight:700, fontSize:15, textAlign:'center', marginBottom:8 }}>Database Cleared</div>
                <div className="text-sm text-muted" style={{ textAlign:'center', marginBottom:16 }}>
                  {clearResult?.total ?? 0} documents deleted.
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:16 }}>
                  {Object.entries(clearResult?.results ?? {}).filter(([,n])=>n>0).map(([col,n])=>(
                    <div key={col} className="text-sm" style={{ display:'flex', justifyContent:'space-between' }}>
                      <span className="text-muted">{col}</span><span>{n} docs</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => setShowClearModal(false)}>Close</button>
              </>
            ) : (
              <>
                <div style={{ fontSize:14, fontWeight:700, color:'#f87171', marginBottom:8 }}>⚠ Confirm: Delete All Data</div>
                <div className="text-sm text-muted" style={{ lineHeight:1.7, marginBottom:16 }}>
                  Deletes all user data — accounts, subscriptions, usage, referrals, creators, orders, and logs. <strong style={{ color:'#4ade80' }}>Groq API key and pricing config are preserved.</strong> There is no undo.
                </div>
                <div className="text-sm" style={{ marginBottom:8, fontWeight:600 }}>
                  Type <code style={{ color:'#f87171' }}>DELETE ALL DATA</code> to confirm:
                </div>
                <input
                  className="input"
                  placeholder="DELETE ALL DATA"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  style={{ marginBottom:16, borderColor: confirmText === 'DELETE ALL DATA' ? '#f87171' : undefined }}
                  autoFocus
                />
                {clearStatus === 'err' && (
                  <div className="alert alert-warning" style={{ fontSize:13, marginBottom:12 }}>⚠ {clearError}</div>
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn" style={{ flex:1 }} onClick={() => setShowClearModal(false)}
                    disabled={clearStatus === 'clearing'}>
                    Cancel
                  </button>
                  <button
                    className="btn"
                    style={{ flex:1, background:'rgba(248,113,113,0.2)', color:'#f87171', border:'1px solid rgba(248,113,113,0.5)' }}
                    disabled={confirmText !== 'DELETE ALL DATA' || clearStatus === 'clearing'}
                    onClick={runClearDb}
                  >
                    {clearStatus === 'clearing' ? 'Deleting…' : 'Delete All Data'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
