'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  GraduationCap,
  CreditCard,
  BookOpen,
  ClipboardList,
  TrendingUp,
  UserCheck,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

const toArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.teachers)) return data.teachers;
  if (Array.isArray(data?.students)) return data.students;
  if (Array.isArray(data?.modules)) return data.modules;
  if (Array.isArray(data?.payments)) return data.payments;
  if (Array.isArray(data?.data?.payments)) return data.data.payments;
  return [];
};

export default function DashboardHome() {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [paidRevenue, setPaidRevenue] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        summaryData,
        studentsData,
        teachersData,
        modulesData,
        paymentsData,
        examsData,
      ] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getStudents(),
        dashboardApi.getTeachers(),
        dashboardApi.getModules(),
        dashboardApi.getPayments(),
        dashboardApi.getExams(),
      ]);

      const safeStudents = toArray(studentsData);
      const safeTeachers = toArray(teachersData);
      const safeModules = toArray(modulesData);
      const safePayments = toArray(paymentsData);
      const safeExams = toArray(examsData);

      const revenue = safePayments
        .filter((p: any) => p.status === 'paid')
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      setSummary(summaryData || {});
      setStudents(safeStudents);
      setTeachers(safeTeachers);
      setModules(safeModules);
      setPayments(safePayments);
      setExams(safeExams);
      setPaidRevenue(revenue);
    } catch (error) {
      console.warn('Failed to load dashboard data:', error);
    }
  };

  const approved = students.filter((s) => s.status === 'approved').length;
  const pending = students.filter((s) => s.status === 'pending').length;

  const moduleChartData = modules.map((m) => {
    const moduleName = m.name || m.moduleName || 'Module';

    return {
      name: moduleName,
      students: students.filter((s) => {
        const studentModules = Array.isArray(s.modules) ? s.modules : [];

        return studentModules.some((item: any) => {
          const value =
            typeof item === 'string'
              ? item
              : item?.name || item?.moduleName || item?._id || item?.id;

          return (
            value === m._id ||
            value === m.id ||
            value === moduleName ||
            value === m.name ||
            value === m.moduleName
          );
        });
      }).length,
    };
  });

  const paymentByModule = Object.values(
    payments.reduce((acc: any, payment: any) => {
      const name = payment.moduleName || 'Unknown Module';
      const amount = Number(payment.amount || 0);

      if (!acc[name]) acc[name] = { name, value: 0 };
      acc[name].value += amount;

      return acc;
    }, {}),
  ).filter((item: any) => item.value > 0);

  const mobileBarHeight = Math.max(220, moduleChartData.length * 48);
  const upcomingExams = exams.slice(0, 5);
  const recentStudents = [...students].slice(-4).reverse();

  const stats = [
    {
      label: 'Total Students',
      value: summary?.totalStudents ?? students.length,
      icon: Users,
      color: 'bg-indigo-500',
      change: '+12%',
    },
    {
      label: 'Approved',
      value: summary?.approvedStudents ?? approved,
      icon: UserCheck,
      color: 'bg-emerald-500',
      change: '+5%',
    },
    {
      label: 'Pending',
      value: summary?.pendingStudents ?? pending,
      icon: Clock,
      color: 'bg-amber-500',
      change: '-2%',
    },
    {
      label: 'Teachers',
      value: summary?.totalTeachers ?? teachers.length,
      icon: GraduationCap,
      color: 'bg-purple-500',
      change: '+1%',
    },
    {
      label: 'Modules',
      value: summary?.totalModules ?? modules.length,
      icon: BookOpen,
      color: 'bg-cyan-500',
      change: '+3%',
    },
    {
      label: 'Paid Payments',
value: `${(paidRevenue / 1000).toFixed(0)}K`,
      icon: CreditCard,
      color: 'bg-rose-500',
      change: '+18%',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Dashboard Overview
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(({ label, value, icon: Icon, color, change }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div
              className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>

            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>

            <span
              className={`text-xs font-medium ${
                change.startsWith('+') ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {change} this month
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Students per Module
          </h3>

          <div className="md:hidden">
            <div style={{ height: mobileBarHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={moduleChartData}
                  layout="vertical"
                  margin={{ top: 6, right: 18, left: -12, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={78}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(name) =>
                      String(name).length > 13
                        ? `${String(name).slice(0, 13)}...`
                        : String(name)
                    }
                  />
                  <Tooltip />
                  <Bar dataKey="students" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="hidden md:block">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={moduleChartData}
                margin={{ top: 8, right: 18, left: -12, bottom: 46 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  angle={-20}
                  textAnchor="end"
                  height={58}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="students" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-500" />
            Revenue by Module
          </h3>

          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={paymentByModule}
                cx="50%"
                cy="48%"
                outerRadius={82}
                paddingAngle={1}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {paymentByModule.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>

              <Tooltip formatter={(v) => `LKR ${Number(v).toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            {paymentByModule.map((item: any, i: number) => (
              <div key={item.name} className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Recent Enrollments
          </h3>

          <div className="space-y-3">
            {recentStudents.length === 0 && (
              <p className="text-gray-400 text-sm">No recent students</p>
            )}

            {recentStudents.map((s: any) => (
              <div key={s.id || s._id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {(s.name || s.fullNameEnglish || 'S').charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {s.name || s.fullNameEnglish || 'Unnamed Student'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.batch || '-'} · {s.studentId || s.admissionNumber || '-'}
                  </p>
                </div>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : s.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {s.status || 'pending'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-500" />
            Upcoming Exams
          </h3>

          <div className="space-y-3">
            {upcomingExams.length === 0 && (
              <p className="text-gray-400 text-sm">No upcoming exams</p>
            )}

            {upcomingExams.map((e: any) => (
              <div
                key={e.id || e._id}
                className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl"
              >
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                  <span className="text-xs font-bold">
                    {e.date ? new Date(e.date).getDate() : '-'}
                  </span>
                  <span className="text-xs">
                    {e.date
                      ? new Date(e.date).toLocaleString('default', {
                          month: 'short',
                        })
                      : '-'}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {e.title || 'Untitled Exam'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {e.moduleName || '-'} · {e.startTime || '-'} -{' '}
                    {e.endTime || '-'}
                  </p>
                  <p className="text-xs text-gray-500">{e.venue || '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
