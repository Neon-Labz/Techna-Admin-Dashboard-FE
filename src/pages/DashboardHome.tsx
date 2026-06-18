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

const splitModuleName = (name: unknown, maxLineLength = 12) => {
  const words = String(name || 'Module').split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['Module'];

  const lines: string[] = [];
  for (const word of words) {
    if (lines.length === 0) {
      lines.push(word);
      continue;
    }

    const current = lines[lines.length - 1];
    const next = `${current} ${word}`;

    if (next.length <= maxLineLength) {
      lines[lines.length - 1] = next;
      continue;
    }

    if (lines.length === 2) break;
    lines.push(word);
  }

  const usedWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (usedWords < words.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/\.+$/, '')}...`;
  }

  return lines.slice(0, 2).map((line) =>
    line.length > maxLineLength + 3
      ? `${line.slice(0, maxLineLength).replace(/\.+$/, '')}...`
      : line,
  );
};

const ModuleAxisTick = ({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: unknown };
}) => {
  const lines = splitModuleName(payload?.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#64748b" fontSize={12}>
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 12 : 13}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

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

  const maxModuleStudents = Math.max(
    1,
    ...moduleChartData.map((item) => item.students),
  );
  const moduleChartTicks =
    maxModuleStudents <= 4
      ? Array.from({ length: maxModuleStudents + 1 }, (_, index) => index)
      : [0, Math.ceil(maxModuleStudents / 2), maxModuleStudents];
  const moduleChartHeight = 240;
  const mobileModuleChartHeight = Math.max(220, moduleChartData.length * 42);
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
    <div className="space-y-6 p-3 pb-20 sm:p-6 sm:pb-6">
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
        <div className="self-start bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Students per Module
            </h3>

            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
              {moduleChartData.length} modules
            </span>
          </div>

          {moduleChartData.length === 0 ? (
            <div className="flex h-56 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-400">
              No module enrolments yet
            </div>
          ) : (
            <>
            <div className="sm:hidden" style={{ height: mobileModuleChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={moduleChartData}
                  layout="vertical"
                  margin={{ top: 6, right: 28, left: -18, bottom: 6 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#eef2f7"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    domain={[0, maxModuleStudents]}
                    ticks={moduleChartTicks}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={108}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#334155' }}
                    tickFormatter={(name) => splitModuleName(name, 11).join(' ')}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value) => [`${value} students`, 'Enrolled']}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar
                    dataKey="students"
                    fill="#6366f1"
                    radius={[0, 7, 7, 0]}
                    barSize={22}
                    label={{
                      position: 'right',
                      fill: '#334155',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="hidden sm:block" style={{ height: moduleChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={moduleChartData}
                  margin={{ top: 16, right: 18, left: -18, bottom: 50 }}
                  barCategoryGap={18}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#eef2f7"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={<ModuleAxisTick />}
                    interval={0}
                    height={56}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, maxModuleStudents]}
                    ticks={moduleChartTicks}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#334155' }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value) => [`${value} students`, 'Enrolled']}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar
                    dataKey="students"
                    fill="#6366f1"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={54}
                    label={{
                      position: 'top',
                      fill: '#334155',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </>
          )}
        </div>

        <div className="self-start bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-500" />
            Revenue by Module
          </h3>

          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={paymentByModule}
                cx="50%"
                cy="50%"
                outerRadius={62}
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

          <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
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
