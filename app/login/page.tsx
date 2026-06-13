'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginWithGoogle } from '@/lib/firebase-client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try { await loginWithGoogle(); router.push(next); }
    catch (err) { setError(err instanceof Error ? err.message : 'Google login failed'); setLoading(false); }
  };

  return (
    <div className="login-card">
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#6366F1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'white', marginBottom: 16 }}>
          AI
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Admin Console</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>JavihAI · Internal Tools</div>
      </div>

      {error && (
        <div className="alert" style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <button onClick={handleGoogle} disabled={loading} className="btn btn-secondary w-full" style={{ gap: 10, height: 44, fontSize: 14 }}>
        {loading ? (
          <span className="profile-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        {loading ? 'Signing in…' : 'Continue with Google'}
      </button>

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Admin access only · Actions are audited
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <Suspense fallback={<div className="login-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
