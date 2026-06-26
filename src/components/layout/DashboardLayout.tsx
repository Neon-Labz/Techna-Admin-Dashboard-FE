'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Outlet } from 'react-router-dom';
import Sidebar, { MobileMenuButton } from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { announcementApi } from '@/api/announcement.api';
import { dashboardApi } from '@/api/dashboard.api';
import {
  Bell,
  CalendarDays,
  CreditCard,
  Megaphone,
  Search,
  UserCheck,
} from 'lucide-react';

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/teachers': 'Teachers',
  '/dashboard/students': 'Students',
  '/dashboard/modules': 'Subjects',
  '/dashboard/payments': 'Payments',
  '/dashboard/exams': 'Exams',
  '/dashboard/attendance': 'Attendance',
  '/dashboard/qr-scan': 'QR Scanner',
  '/dashboard/profile': 'Profile',
};

const READ_NOTIFICATION_IDS_KEY = 'admin-read-notification-ids';

type AdminNotification = {
  id: string;
  title: string;
  description: string;
  meta: string;
  href: string;
  tone: 'amber' | 'red' | 'blue' | 'indigo';
  icon: 'student' | 'payment' | 'exam' | 'announcement';
};

const formatDate = (value?: string) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const isWithinNextDays = (value?: string, days = 7) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);

  return date >= today && date <= limit;
};

const getEntityId = (item: any, fallback: string) =>
  String(item?.id || item?._id || item?.studentId || item?.receiptNo || fallback);

const readStoredNotificationIds = () => {
  if (typeof window === 'undefined') return new Set<string>();

  try {
    const stored = localStorage.getItem(READ_NOTIFICATION_IDS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

const writeStoredNotificationIds = (ids: Set<string>) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(READ_NOTIFICATION_IDS_KEY, JSON.stringify([...ids]));
};

export default function DashboardLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    () => readStoredNotificationIds(),
  );
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const pathname = usePathname();
  const router = useRouter();
  const pageName = pageNames[pathname ?? '/dashboard'] || 'Dashboard';

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setNotificationsLoading(true);
      setNotificationsError(null);

      try {
        const [students, payments, exams, announcements] = await Promise.all([
          dashboardApi.getStudents(),
          dashboardApi.getPayments(),
          dashboardApi.getExams(),
          announcementApi.getAll(),
        ]);

        if (!active) return;

        const pendingStudents = Array.isArray(students)
          ? students.filter((student: any) => student.status === 'pending')
          : [];

        const paymentAlerts = Array.isArray(payments)
          ? payments.filter((payment: any) =>
              ['pending', 'overdue'].includes(payment.status),
            )
          : [];

        const upcomingExams = Array.isArray(exams)
          ? exams.filter(
              (exam: any) =>
                exam.status === 'upcoming' || isWithinNextDays(exam.date, 14),
            )
          : [];

        const recentAnnouncements = Array.isArray(announcements)
          ? [...announcements]
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt || b.date || 0).getTime() -
                  new Date(a.createdAt || a.date || 0).getTime(),
              )
              .slice(0, 2)
          : [];

        const nextNotifications: AdminNotification[] = [];

        if (pendingStudents.length > 0) {
          nextNotifications.push({
            id: `student-approvals-${pendingStudents
              .map((student: any, index: number) =>
                getEntityId(student, `pending-${index}`),
              )
              .sort()
              .join('-')}`,
            title: `${pendingStudents.length} student approval${
              pendingStudents.length === 1 ? '' : 's'
            } pending`,
            description: pendingStudents
              .slice(0, 2)
              .map((student: any) => student.name || student.email || 'New student')
              .join(', '),
            meta: 'Student approvals',
            href: '/dashboard/students',
            tone: 'amber',
            icon: 'student',
          });
        }

        paymentAlerts.slice(0, 3).forEach((payment: any) => {
          const paymentId = getEntityId(
            payment,
            `${payment.studentName}-${payment.moduleName}`,
          );

          nextNotifications.push({
            id: `payment-${payment.status}-${paymentId}`,
            title:
              payment.status === 'overdue'
                ? 'Overdue payment'
                : 'Pending payment',
            description: `${payment.studentName || 'Student'}${
              payment.moduleName ? ` - ${payment.moduleName}` : ''
            }`,
            meta: payment.paidDate ? formatDate(payment.paidDate) : 'Payments',
            href: '/dashboard/payments',
            tone: payment.status === 'overdue' ? 'red' : 'amber',
            icon: 'payment',
          });
        });

        upcomingExams.slice(0, 3).forEach((exam: any) => {
          const examId = getEntityId(exam, `${exam.title}-${exam.date}`);

          nextNotifications.push({
            id: `exam-${examId}`,
            title: exam.title || 'Upcoming exam',
            description: exam.moduleName || exam.batch || 'Exam notice',
            meta: formatDate(exam.date) || 'Upcoming',
            href: '/dashboard/exams',
            tone: 'blue',
            icon: 'exam',
          });
        });

        recentAnnouncements.forEach((announcement: any) => {
          const announcementId = getEntityId(
            announcement,
            `${announcement.title}-${announcement.date}`,
          );

          nextNotifications.push({
            id: `announcement-${announcementId}`,
            title: announcement.title || 'Recent announcement',
            description:
              announcement.batch || announcement.audience || 'All Students',
            meta:
              formatDate(announcement.createdAt || announcement.date) ||
              'Announcement',
            href: '/dashboard/announcements',
            tone: 'indigo',
            icon: 'announcement',
          });
        });

        setNotifications(nextNotifications.slice(0, 8));
      } catch {
        if (active) {
          setNotificationsError('Unable to load notifications');
        }
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  const unreadNotificationCount = notifications.filter(
    (notification) => !readNotificationIds.has(notification.id),
  ).length;

  const markNotificationIdsRead = (ids: string[]) => {
    if (ids.length === 0) return;

    setReadNotificationIds((currentIds) => {
      const nextIds = new Set(currentIds);
      let changed = false;

      ids.forEach((id) => {
        if (!nextIds.has(id)) {
          nextIds.add(id);
          changed = true;
        }
      });

      if (changed) {
        writeStoredNotificationIds(nextIds);
      }

      return changed ? nextIds : currentIds;
    });
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    markNotificationIdsRead([notification.id]);
    setNotificationsOpen(false);
    router.push(notification.href);
  };

  useEffect(() => {
    if (!notificationsOpen || notifications.length === 0) return;

    markNotificationIdsRead(notifications.map((notification) => notification.id));
  }, [notificationsOpen, notifications]);

  const iconMap = useMemo(
    () => ({
      student: UserCheck,
      payment: CreditCard,
      exam: CalendarDays,
      announcement: Megaphone,
    }),
    [],
  );

  const toneClass: Record<AdminNotification['tone'], string> = {
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-3 py-3 bg-white border-b border-gray-100 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            <h2 className="font-semibold text-gray-800 hidden sm:block">
              {pageName}
            </h2>
          </div>

          <div className="flex items-center gap-3">
           

            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] leading-4 rounded-full text-center">
                    {unreadNotificationCount > 9
                      ? '9+'
                      : unreadNotificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Notifications
                      </h3>
                      <p className="text-xs text-gray-500">
                        Admin activity requiring attention
                      </p>
                    </div>
                    {unreadNotificationCount > 0 && (
                      <span className="text-xs font-semibold text-indigo-600">
                        {unreadNotificationCount} new
                      </span>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto py-2">
                    {notificationsLoading && (
                      <div className="px-4 py-6 text-sm text-gray-500">
                        Loading notifications...
                      </div>
                    )}

                    {!notificationsLoading && notificationsError && (
                      <div className="px-4 py-6 text-sm text-red-600">
                        {notificationsError}
                      </div>
                    )}

                    {!notificationsLoading &&
                      !notificationsError &&
                      notifications.length === 0 && (
                        <div className="px-4 py-6 text-sm text-gray-500">
                          No admin notifications right now.
                        </div>
                      )}

                    {!notificationsLoading &&
                      !notificationsError &&
                      notifications.map((notification) => {
                        const NotificationIcon = iconMap[notification.icon];

                        return (
                          <button
                            type="button"
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className="flex w-full gap-3 px-4 py-3 text-left hover:bg-gray-50"
                          >
                            <div
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass[notification.tone]}`}
                            >
                              <NotificationIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {notification.description}
                              </p>
                              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                                {notification.meta}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

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

        <main className="flex-1 overflow-y-auto">{children || <Outlet />}</main>
      </div>
    </div>
  );
}