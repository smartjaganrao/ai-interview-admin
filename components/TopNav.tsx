'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface TopNavProps {
  email: string;
  isAdmin?: boolean;
}

export default function TopNav({ email, isAdmin = true }: TopNavProps) {
  const router = useRouter();
  const { logout, isLoading } = useAdminAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push(isAdmin ? '/admin/login' : '/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="border-b border-gray-700 bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={isAdmin ? '/admin/dashboard' : '/'} className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"></div>
              <h1 className="text-xl font-bold text-white">
                {isAdmin ? 'AI Interview Admin' : 'AI Interview Helper'}
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link href="/" className="text-sm text-gray-400 hover:text-gray-200 transition">
                ← Back to App
              </Link>
            )}
            <span className="text-sm text-gray-400">{email}</span>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
