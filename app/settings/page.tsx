'use client';

import { useState, useEffect } from 'react';
import AdminShell from '@/components/AdminShell';

const ROLE_BADGE: Record<string,string> = { 'super-admin':'badge-purple', moderator:'badge-indigo', analyst:'badge-slate' };

export default function SettingsPage() {
  const [tab, setTab] = useState<'org'|'aikeys'>('aikeys');

  // ── AI Keys tab state ────────────────────────────────────────────────────
  const [keyInfo, setKeyInfo] = useState<{
    groqKeySet:boolean; groqKeyMasked:string;
    rzpKeyIdSet:boolean; rzpKeyIdMasked:string;
    rzpSecretSet:boolean; rzpSecretMasked:string;
    updatedAt:number|null; updatedBy:string|null;
  } | null>(null);

  // Groq
  const [newGroqKey, setNewGroqKey] = useState('');
  const [showKey, setShowKey]       = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'ok'|'err'>('idle');
  const [saveMsg, setSaveMsg]       = useState('');

  // Razorpay
  const [newRzpKeyId, setNewRzpKeyId]         = useState('');
  const [newRzpSecret, setNewRzpSecret]       = useState('');
  const [showRzpSecret, setShowRzpSecret]     = useState(false);
  const [rzpStatus, setRzpStatus]             = useState<'idle'|'saving'|'ok'|'err'>('idle');
  const [rzpMsg, setRzpMsg]                   = useState('');

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
        refreshKeyInfo();
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

  const refreshKeyInfo = () => {
    fetch('/api/settings/api-keys', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setKeyInfo(d))
      .catch(() => {});
  };

  const saveRazorpayKeys = async () => {
    if (!newRzpKeyId.trim() && !newRzpSecret.trim()) return;
    setRzpStatus('saving');
    try {
      const body: Record<string, string> = {};
      if (newRzpKeyId.trim())   body.razorpayKeyId     = newRzpKeyId.trim();
      if (newRzpSecret.trim())  body.razorpayKeySecret = newRzpSecret.trim();
      const r = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.ok) {
        setRzpStatus('ok');
        setRzpMsg('Razorpay keys saved. Payments will use the new keys immediately.');
        setNewRzpKeyId('');
        setNewRzpSecret('');
        setShowRzpSecret(false);
        refreshKeyInfo();
      } else {
        setRzpStatus('err');
        setRzpMsg(data.error || 'Failed to save keys');
      }
    } catch {
      setRzpStatus('err');
      setRzpMsg('Network error — try again');
    }
    setTimeout(() => setRzpStatus('idle'), 4000);
  };

  return (
    <AdminShell title="Settings" subtitle="API keys &amp; organization configuration">
      <div className="tabs">
        {[{id:'aikeys',label:'AI Keys'},{id:'org',label:'Organization'}].map((t) => (
          <button key={t.id} className={`tab${tab===t.id?' active':''}`}
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

            {/* ── Razorpay Keys ──────────────────────────────────────────── */}
            <div className="card" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <div className="font-semibold mb-2" style={{ fontSize: 13 }}>💳 How Razorpay keys work</div>
              <div className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
                Keys are stored in Firestore and read server-side on every checkout. The <strong>Key Secret</strong> never
                reaches the browser. Switch between test and live keys here — no redeploy needed.
              </div>
            </div>

            <div className="card">
              <div className="font-semibold mb-4" style={{ fontSize: 14 }}>Current Razorpay Keys</div>
              {keyInfo === null ? (
                <div className="text-muted text-sm">Loading…</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { label:'Key ID', set: keyInfo.rzpKeyIdSet, masked: keyInfo.rzpKeyIdMasked },
                    { label:'Key Secret', set: keyInfo.rzpSecretSet, masked: keyInfo.rzpSecretMasked },
                  ].map((k) => (
                    <div key={k.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span className="text-sm text-muted" style={{ width:80, flexShrink:0 }}>{k.label}</span>
                      {k.set ? (
                        <>
                          <code style={{ background:'var(--surface-2)', padding:'4px 10px', borderRadius:6, fontSize:13, flex:1, color:'var(--text)', letterSpacing:'0.05em' }}>{k.masked}</code>
                          <span className="badge badge-green">Active</span>
                        </>
                      ) : (
                        <span className="badge badge-red">Not set</span>
                      )}
                    </div>
                  ))}
                  {keyInfo.updatedAt && (
                    <div className="text-sm text-muted" style={{ marginTop:4 }}>
                      Last updated {new Date(keyInfo.updatedAt).toLocaleString()} by {keyInfo.updatedBy}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <div className="font-semibold mb-4" style={{ fontSize: 14 }}>Update Razorpay Keys</div>
              <div className="text-sm text-muted mb-4">
                Get your keys from{' '}
                <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer"
                   style={{ color:'var(--primary-light)' }}>dashboard.razorpay.com → Settings → API Keys</a>.
                Use <code>rzp_test_…</code> for testing, <code>rzp_live_…</code> for production.
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
                <input
                  type="text"
                  placeholder="Key ID  (rzp_test_… or rzp_live_…)"
                  value={newRzpKeyId}
                  onChange={(e) => setNewRzpKeyId(e.target.value)}
                  className="input"
                  autoComplete="off"
                />
                <div style={{ position:'relative' }}>
                  <input
                    type={showRzpSecret ? 'text' : 'password'}
                    placeholder="Key Secret"
                    value={newRzpSecret}
                    onChange={(e) => setNewRzpSecret(e.target.value)}
                    className="input"
                    style={{ paddingRight: 40 }}
                    autoComplete="off"
                  />
                  <button
                    onClick={() => setShowRzpSecret(v => !v)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14 }}
                  >
                    {showRzpSecret ? '🙈' : '👁'}
                  </button>
                </div>
                <button
                  className="btn btn-primary"
                  disabled={rzpStatus === 'saving' || (!newRzpKeyId.trim() && !newRzpSecret.trim())}
                  onClick={saveRazorpayKeys}
                >
                  {rzpStatus === 'saving' ? 'Saving…' : 'Save Razorpay Keys'}
                </button>
              </div>

              {rzpStatus === 'ok' && <div className="alert alert-success" style={{ fontSize:13 }}>✓ {rzpMsg}</div>}
              {rzpStatus === 'err' && <div className="alert alert-warning" style={{ fontSize:13 }}>⚠ {rzpMsg}</div>}

              <div className="text-sm text-muted" style={{ marginTop:12, lineHeight:1.6 }}>
                🔒 Key Secret is stored in Firestore and only read by the server. It never reaches the browser.
                You can update Key ID and Secret independently — leave a field blank to keep the existing value.
              </div>
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
    </AdminShell>
  );
}
