'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isTokenExpired = useAuthStore(s => s.isTokenExpired);
  const loadSession = useAuthStore(s => s.loadSession);
  const logout = useAuthStore(s => s.logout);
  const hasHydrated = useAuthStore(s => s._hasHydrated);
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for Zustand to hydrate from localStorage before making auth decisions
    if (!hasHydrated) return;

    const checkAuth = () => {
      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }

      // Check if token is expired
      if (isTokenExpired()) {
        logout();
        router.replace('/login');
        return;
      }

      // Token is valid — show dashboard immediately
      setIsReady(true);

      // Refresh session data in the background (non-blocking)
      loadSession();
    };

    checkAuth();
  }, [hasHydrated, isAuthenticated, isTokenExpired, loadSession, logout, router]);

  if (!hasHydrated || !isAuthenticated || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
