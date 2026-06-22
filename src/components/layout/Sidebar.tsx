'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  BookOpen,
  ClipboardList,
  Calendar,
  LogOut,
  GraduationCap as Logo,
  UserCircle,
  X,
  Menu,
  QrCode,
  Play,
  Award,
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/dashboard/teachers', icon: GraduationCap, label: 'Teachers' },
  { path: '/dashboard/students', icon: Users, label: 'Students' },
  { path: '/dashboard/modules', icon: BookOpen, label: 'Modules' },
  { path: '/dashboard/videos', icon: Play, label: 'Videos' },
  { path: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
  { path: '/dashboard/exams', icon: ClipboardList, label: 'Exams' },
  { path: '/dashboard/results', icon: Award, label: 'Results' },
  { path: '/dashboard/announcements', icon: Megaphone, label: 'Announcements' },
  { path: '/dashboard/attendance', icon: Calendar, label: 'Attendance' },
  { path: '/dashboard/qr-scan', icon: QrCode, label: 'QR Scanner' },
  { path: '/dashboard/profile', icon: UserCircle, label: 'Profile' },
];
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const pathname = usePathname() || '/dashboard';
  const router = useRouter();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.replace('/login');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-indigo-950 to-indigo-900 z-30 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Logo className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Techna</p>
              <p className="text-indigo-300 text-xs">Management System</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-indigo-300 text-xs truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive =
              path === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(path);

            return (
              <Link
                key={path}
                href={path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-200 hover:bg-red-500/20 hover:text-red-300 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}