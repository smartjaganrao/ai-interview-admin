'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmail, loginWithGoogle } from '@/lib/firebase-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed');
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-mesh bg-grid min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl gradient-primary items-center justify-center text-white font-bold text-2xl mb-4 animate-pulse-glow">
            AI
          </div>
          <h1 className="text-2xl font-black text-white">Admin Control Center</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to manage your platform</p>
        </div>

        <div className="card">
          <div className="mb-6 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-300">
            🔒 <strong>Admin access only.</strong> Your account must have the admin claim. Live data requires the backend secret configured.
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn btn-secondary w-full mb-4"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-3 bg-[#0f1729] text-slate-400">or</span></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" className="input" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input" required />
            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in...' : 'Sign In to Admin →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <button onClick={() => router.push('/')} className="text-sm text-slate-400 hover:text-white transition-smooth">
              Preview dashboard with demo data →
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Not an admin? <a href="https://ai-interview-landing-phi.vercel.app" className="text-indigo-400 hover:text-indigo-300">Go to main site →</a>
        </p>
      </div>
    </div>
  );
}
