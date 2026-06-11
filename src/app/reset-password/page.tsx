import { Suspense } from 'react';
import ResetPasswordPage from '@/components/auth/ResetPasswordPage';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600">
        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordPage />
    </Suspense>
  );
}
