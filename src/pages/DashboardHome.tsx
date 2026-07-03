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

const formatModuleAxisLabel = (name: unknown, maxLength = 18) => {
  const label = String(name || 'Module').trim();
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength).trimEnd()}...`;
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
  const label = formatModuleAxisLabel(payload?.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        transform="rotate(-38)"
        textAnchor="end"
        fill="#475569"
        fontSize={11}
        fontWeight={600}
      >
        {label}
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
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, icon: Icon, color, change }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>

            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>

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

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <div className="h-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
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
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={moduleChartData}
                  margin={{ top: 16, right: 16, left: -18, bottom: 76 }}
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
                    height={82}
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
                    maxBarSize={38}
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
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
            <CreditCard className="h-4 w-4 text-indigo-500" />
            Revenue by Module
          </h3>

          {paymentByModule.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-400">
              No revenue records yet
            </div>
          ) : (
            <>
              <div className="flex-1">
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

                    <Tooltip
                      formatter={(v) => `LKR ${Number(v).toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                {paymentByModule.map((item: any, i: number) => (
                  <div
                    key={item.name}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate text-gray-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
            <Users className="h-4 w-4 text-indigo-500" />
            Recent Enrollments
          </h3>

          <div className="space-y-3">
            {recentStudents.length === 0 && (
              <p className="text-sm text-gray-400">No recent students</p>
            )}

            {recentStudents.map((s: any) => (
              <div key={s.id || s._id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                  {(s.name || s.fullNameEnglish || 'S').charAt(0)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {s.name || s.fullNameEnglish || 'Unnamed Student'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.batch || '-'} · {s.studentId || s.admissionNumber || '-'}
                  </p>
                </div>

                <span
                  className={`inline-flex h-6 w-20 flex-shrink-0 items-center justify-center rounded-full px-2 text-xs font-medium leading-none ${
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

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
            <ClipboardList className="h-4 w-4 text-indigo-500" />
            Upcoming Exams
          </h3>

          <div className="space-y-3">
            {upcomingExams.length === 0 && (
              <p className="text-sm text-gray-400">No upcoming exams</p>
            )}

            {upcomingExams.map((e: any) => (
              <div
                key={e.id || e._id}
                className="flex items-start gap-3 rounded-xl bg-indigo-50 p-3"
              >
                <div className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-600 text-white">
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
