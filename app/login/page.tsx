'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, setError } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setError(null);

    if (!email || !password) {
      setLocalError('Please enter email and password');
      return;
    }

    try {
      await login(email, password);
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setLocalError(err.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-8">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"></div>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-white">
            Admin Dashboard
          </h1>
          <p className="mb-8 text-center text-gray-400">
            Sign in to manage users and analytics
          </p>

          {/* Error Messages */}
          {(localError || error) && (
            <div className="mb-6 rounded-lg border border-red-600 bg-red-900 bg-opacity-20 p-4">
              <p className="text-sm text-red-400">{localError || error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="admin@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <p className="text-xs text-gray-400">
              <strong>Demo Note:</strong> Only users with the{' '}
              <code className="bg-gray-900 px-1">admin</code> custom claim in
              Firebase can log in. Contact your super admin to get access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
