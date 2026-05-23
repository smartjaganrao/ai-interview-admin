'use client';

import { useState } from 'react';
import { loginWithEmail, logout } from '@/lib/firebase-client';

export function useAdminAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginWithEmail(email, password);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      // Redirect to login will happen via Next.js navigation
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    logout: handleLogout,
    isLoading,
    error,
    setError,
  };
}
