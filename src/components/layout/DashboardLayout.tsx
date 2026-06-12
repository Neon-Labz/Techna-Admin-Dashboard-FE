'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Outlet } from 'react-router-dom';
import Sidebar, { MobileMenuButton } from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { Bell, Search } from 'lucide-react';

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/teachers': 'Teachers',
  '/dashboard/students': 'Students',
  '/dashboard/modules': 'Modules',
  '/dashboard/payments': 'Payments',
  '/dashboard/exams': 'Exams',
  '/dashboard/attendance': 'Attendance',
  '/dashboard/qr-scan': 'QR Scanner',
  '/dashboard/profile': 'Profile',
};

export default function DashboardLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  const pathname = usePathname();
  const pageName = pageNames[pathname ?? '/dashboard'] || 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            <h2 className="font-semibold text-gray-800 hidden sm:block">
              {pageName}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                placeholder="Quick search..."
                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 bg-gray-50"
              />
            </div>

            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user?.name || 'User'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}