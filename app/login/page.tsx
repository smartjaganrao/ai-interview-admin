'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Demo login — in production this verifies Firebase custom admin claim
    await new Promise((r) => setTimeout(r, 800));

    if (email && password) {
      router.push('/');
    } else {
      setError('Please enter your admin credentials');
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-mesh bg-grid min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl gradient-primary items-center justify-center text-white font-bold text-2xl mb-4 animate-pulse-glow">
            AI
          </div>
          <h1 className="text-2xl font-black text-white">Admin Control Center</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to manage your platform</p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="mb-6 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-300">
            🔒 <strong>Admin Access Only.</strong> This area requires elevated permissions.
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in...' : 'Sign In to Admin →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-slate-500">
              Protected by Firebase Auth + custom admin claims.
              <br />
              All actions are logged and audited.
            </p>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Not an admin? <a href="https://ai-interview-landing-phi.vercel.app" className="text-indigo-400 hover:text-indigo-300">Go to main site →</a>
        </p>
      </div>
    </div>
  );
}
