'use client';
import Link from 'next/link';
import { GraduationCap, ShieldAlert } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Techna</h1>
          <p className="text-indigo-300 mt-1">School Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mb-4">
            <ShieldAlert className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin Registration</h2>
          <p className="text-gray-500 text-sm mb-6">
            Admin accounts can only be created by the system administrator. 
            Please contact your administrator if you need access.
          </p>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
