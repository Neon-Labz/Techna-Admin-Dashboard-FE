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
  Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

export default function DashboardHome() {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryData, studentsData, modulesData, examsData,  revenueData] =
    await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getStudents(),
        dashboardApi.getModules(),
        dashboardApi.getExams(),
        dashboardApi.getRevenue(),
  ]);

setSummary(summaryData);
setStudents(Array.isArray(studentsData) ? studentsData : []);
setTeachers([]);
setModules(Array.isArray(modulesData) ? modulesData : []);
setExams(Array.isArray(examsData) ? examsData : []);
setRevenue(
  Array.isArray(revenueData)
    ? revenueData.reduce((sum, item) => sum + (item.value || 0), 0)
    : revenueData?.totalRevenue || 0
);    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const approved = students.filter((s) => s.status === 'approved').length;
  const pending = students.filter((s) => s.status === 'pending').length;

const totalRevenue = revenue;
  const moduleChartData = modules.map((m) => ({
    name: m.name || m.moduleName || 'Module',
    students: students.filter((s) =>
(Array.isArray(s.modules) ? s.modules : []).some((moduleId: any) => {
          const id = typeof moduleId === 'string' ? moduleId : moduleId?._id;
        return id === m._id || id === m.id;
      })
    ).length,
  }));

  const paymentByModule = modules.map((m) => ({
    name: m.name || m.moduleName || 'Module',
    value: m.fee || 0,
  }));

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
      value: approved,
      icon: UserCheck,
      color: 'bg-emerald-500',
      change: '+5%',
    },
    {
      label: 'Pending',
      value: pending,
      icon: Clock,
      color: 'bg-amber-500',
      change: '-2%',
    },
    {
      label: 'Teachers',
      value: summary?.totalTeachers || 0,
      icon: GraduationCap,
      color: 'bg-purple-500',
      change: '+1%',
    },
    {
      label: 'Modules',
  value: summary?.totalModules || modules.length,
      icon: BookOpen,
      color: 'bg-cyan-500',
      change: '+3%',
    },
    {
      label: 'Revenue (LKR)',
      value: `${(totalRevenue / 1000).toFixed(0)}K`,
      icon: CreditCard,
      color: 'bg-rose-500',
      change: '+18%',
    },
  ];

  const upcomingExams = exams.filter((e) => e.status === 'upcoming').slice(0, 3);
  const recentStudents = [...students].slice(-4).reverse();

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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Students per Module
          </h3>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={moduleChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="students" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-500" />
            Revenue by Module
          </h3>

          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={paymentByModule}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {paymentByModule.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => `LKR ${Number(v).toLocaleString()}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
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

            {recentStudents.map((s) => (
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

            {upcomingExams.map((e) => (
              <div
                key={e.id || e._id}
                className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl"
              >
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0">
                  <span className="text-xs font-bold">
                    {new Date(e.date).getDate()}
                  </span>
                  <span className="text-xs">
                    {new Date(e.date).toLocaleString('default', {
                      month: 'short',
                    })}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {e.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {e.moduleName} · {e.startTime} - {e.endTime}
                  </p>
                  <p className="text-xs text-gray-500">{e.venue}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}