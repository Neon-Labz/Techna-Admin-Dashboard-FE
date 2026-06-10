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
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
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

      // Validate session with backend
      await loadSession();
      setIsReady(true);
    };

    checkAuth();
  }, [isAuthenticated, isTokenExpired, loadSession, logout, router]);

  if (!isAuthenticated || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
