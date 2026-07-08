'use client';

import Image from 'next/image';
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
  { path: '/dashboard/modules', icon: BookOpen, label: 'Subjects' },
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
  const { logout } = useAuthStore();
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
          className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-[70] h-full w-64 bg-gradient-to-b from-indigo-950 to-indigo-900 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="relative border-b border-white/10 pt-6 pb-5">
          <div className="flex flex-col items-start pl-6">
            <Image
              src="/new1.png"
              alt="Techna Logo"
              width={140}
              height={60}
              className="block w-[150px] h-auto object-contain"
              priority
            />

            <p className="mt-6 text-white font-bold text-lg tracking-wide">
              ADMIN PANEL
            </p>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 lg:hidden text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-3 space-y-2">
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