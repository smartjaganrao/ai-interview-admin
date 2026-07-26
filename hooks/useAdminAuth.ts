'use client';

import { useState } from 'react';
import { loginWithGoogle, logout } from '@/lib/firebase-client';

export function useAdminAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    loginGoogle,
    logout: handleLogout,
    isLoading,
    error,
    setError,
  };
}
