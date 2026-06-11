'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  // Zustand persist rehydrates asynchronously. On the first render the store
  // always has isAuthenticated=false (the default), which would wrongly redirect
  // a logged-in user to /login. We wait one tick (useEffect fires after hydration)
  // before making the auth decision.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.replace('/login');
  }, [mounted, isAuthenticated, router]);

  if (!mounted) return null;          // wait for hydration — no flash
  if (!isAuthenticated) return null;  // hydrated and not logged in → redirect in flight

  return <DashboardLayout>{children}</DashboardLayout>;
}
