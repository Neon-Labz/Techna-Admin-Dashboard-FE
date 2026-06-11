'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Password reset link sent!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="absolute top-10 left-10 w-72 h-72 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 13L4 11.18v3.64L12 19l8-4.18v-3.64L12 16z" />
        </svg>
        <svg className="absolute bottom-10 right-10 w-80 h-80 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 2.5c1.38 0 2.5 1.12 2.5 2.5S13.38 9.5 12 9.5 9.5 8.38 9.5 7 10.62 4.5 12 4.5z" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
          {/* Logo */}
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

          <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">Forgot Password?</h2>
          <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
            No worries! Enter your email address and<br />
            we&apos;ll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center p-6 bg-green-50 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-gray-700 font-semibold mb-1">Check your inbox</p>
                <p className="text-gray-500 text-sm">
                  We&apos;ve sent a password reset link to<br />
                  <span className="font-medium text-gray-700">{email}</span>
                </p>
              </div>

              {/* Resend button */}
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await authApi.forgotPassword(email);
                    toast.success('Reset link resent!');
                  } catch {
                    toast.error('Failed to resend. Try again later.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <>Resend Reset Link</>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all"
                    placeholder="admin@techna.lk"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Info box */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-500 leading-relaxed">
                  We&apos;ll send a secure password reset link to your registered admin email address.
                </p>
              </div>
            </form>
          )}

          {/* Back to Sign In */}
          <div className="text-center mt-8">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
