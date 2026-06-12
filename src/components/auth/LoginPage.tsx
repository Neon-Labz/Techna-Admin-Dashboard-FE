'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toasts, addToast, removeToast } = useToast();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);

    if (res.success) {
      addToast('Welcome back, Admin!', 'success');
      setTimeout(() => router.replace('/dashboard'), 800);
    } else {
      addToast(res.error || 'Login failed', 'error');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 overflow-hidden">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg
          className="absolute top-10 left-10 w-72 h-72 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 13L4 11.18v3.64L12 19l8-4.18v-3.64L12 16z" />
        </svg>

        <svg
          className="absolute bottom-10 right-10 w-80 h-80 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 2.5c1.38 0 2.5 1.12 2.5 2.5S13.38 9.5 12 9.5 9.5 8.38 9.5 7 10.62 4.5 12 4.5z" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/logo.png"
              alt="Techna"
              width={180}
              height={180}
              className="object-contain"
              priority
            />
          </div>

          <h2 className="text-3xl font-bold text-gray-800 text-center mb-1">
            Admin Portal
          </h2>

          <p className="text-gray-500 text-sm text-center mb-2">
            Sign in to your Techna Admin Dashboard
          </p>

          <div className="flex items-center justify-center gap-1.5 mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">
              Authorized Admin Access Only
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all"
                  placeholder="admin@techna.lk"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all"
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Remember me
              </label>

              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}