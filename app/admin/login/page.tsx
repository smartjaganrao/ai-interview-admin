'use client';

import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginGoogle, isLoading, error, setError } = useAdminAuth();

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await loginGoogle();
      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
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
            Sign in with Google to manage users and analytics
          </p>

          {/* Error Messages */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-600 bg-red-900 bg-opacity-20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 font-medium text-white hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {/* Google Logo SVG */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>

          {/* Help Text */}
          <div className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <p className="text-xs text-gray-400">
              <strong>Admin Only:</strong> Only users with the admin custom claim in Firebase can access this panel. Make sure Google Sign-In is enabled in Firebase Authentication and you have the admin custom claim set.
            </p>
          </div>

          {/* Additional Info */}
          <div className="mt-4 rounded-lg border border-blue-700 bg-blue-900 bg-opacity-20 p-4">
            <p className="text-xs text-blue-300">
              <strong>First Time?</strong> Your Gmail account will be created automatically if it doesn&apos;t exist in Firebase.
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <a href="/" className="text-sm text-gray-400 hover:text-gray-200 transition">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
