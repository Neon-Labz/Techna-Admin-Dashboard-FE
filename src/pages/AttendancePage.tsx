'use client';
import { Fragment, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getModules, getStudents, getAttendance, createAttendance,
  updateAttendance as apiUpdateAttendance, deleteAttendance,
  type ApiModule, type ApiStudent, type ApiAttendance,
} from '@/lib/api';
import { Calendar, Filter, Search, CheckCircle, XCircle, Users, ChevronDown, Trash2, History, Plus } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/common/Toast';
import DeleteModal from '@/components/common/DeleteModal';
import CompactDatePicker from '@/components/ui/CompactDatePicker';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type SelectOption = {
  value: string;
  label: string;
};

function CompactSelect({
  value,
  options,
  onChange,
  className = '',
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-xs outline-none focus:ring-2 focus:ring-indigo-500 sm:rounded-xl sm:text-sm"
      >
        <span className="truncate">{selected?.label || value}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-56 min-w-0 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full min-w-0 px-3 py-2 text-left text-xs hover:bg-indigo-50 sm:text-sm ${
                option.value === value
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'text-gray-700'
              }`}
            >
              <span className="block truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();

  const [modules, setModules] = useState<ApiModule[]>([]);
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [attendances, setAttendances] = useState<ApiAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBatch, setFilterBatch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<ApiAttendance | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [contactTarget, setContactTarget] = useState<{
    student: ApiStudent | null;
    record: ApiAttendance;
  } | null>(null);

  // ✅ Derive BATCHES dynamically from loaded students — no hardcode
  const BATCHES = Array.from(
    new Set(students.map(s => s.batch).filter(Boolean))
  ) as string[];

  useEffect(() => {
    Promise.all([getModules(), getStudents()])
      .then(([mods, studs]) => { setModules(mods); setStudents(studs); setLoading(false); })
      .catch(() => { addToast('Failed to load data', 'error'); setLoading(false); });
  }, []);

  const fetchAttendance = useCallback(async (date?: string) => {
    try {
      const params: Record<string, string> = {};
      if (date) params.date = date;
      const data = await getAttendance(params);
      setAttendances(Array.isArray(data) ? data : []);
    } catch {
      addToast('Failed to load attendance', 'error');
    }
  }, []);

  useEffect(() => {
    fetchAttendance(filterDate || undefined);
  }, [filterDate, fetchAttendance]);

  const markAttendance = async (studentId: string, moduleId: string, status: 'present' | 'absent') => {
    try {
      const existing = attendances.find(a => a.studentId === studentId && a.moduleId === moduleId);
      if (existing) {
        await apiUpdateAttendance(existing._id, { status });
      } else {
        const moduleName = modules.find(m => m._id === moduleId)?.name ?? moduleId;
        await createAttendance({
          studentId,
          moduleId,
          moduleName,
          date: new Date(filterDate).toISOString(),
          status,
          markedAt: new Date().toISOString(),
        });
      }
      fetchAttendance(filterDate || undefined);
    } catch {
      addToast('Failed to mark attendance', 'error');
    }
  };

  const handleMarkAttendance = async (record: ApiAttendance, status: 'present' | 'absent') => {
    if (record.status === status) return;
    try {
      await apiUpdateAttendance(record._id, { status });
      addToast(`Marked as ${status}`, 'success');
      fetchAttendance(filterDate || undefined);
    } catch {
      addToast('Failed to mark attendance', 'error');
    }
  };

  const filteredAttendances = attendances.filter(a => {
    const student = students.find(s => s.studentId === a.studentId);
    const matchModule = !filterModule || a.moduleId === filterModule;
    const matchBatch = !filterBatch || student?.batch === filterBatch;
    const matchDate = !filterDate || a.date.startsWith(filterDate) || (a.sessionDate ?? '').startsWith(filterDate);
    const studentName = student?.fullNameEnglish ?? '';
    const matchSearch = !search ||
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      a.studentId.toLowerCase().includes(search.toLowerCase());
    return matchModule && matchBatch && matchDate && matchSearch;
  });

  const groupedByModule = filteredAttendances.reduce((acc, record) => {
    const key = record.moduleName || record.moduleId || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {} as Record<string, ApiAttendance[]>);

  const groupedModuleKeys = Object.keys(groupedByModule);

  useEffect(() => {
    if (groupedModuleKeys.length > 0 && expandedModules.size === 0) {
      setExpandedModules(new Set(groupedModuleKeys));
    }
  }, [groupedModuleKeys.join('|'), expandedModules.size]);

  const totalStudents = new Set(filteredAttendances.map(a => a.studentId)).size;
  const totalPresent = filteredAttendances.filter(a => a.status === 'present').length;
  const totalAbsent = filteredAttendances.filter(a => a.status === 'absent').length;

  const toggleModule = (key: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const today = new Date().toISOString().split('T')[0];

  const getStudentName = (student: ApiStudent | undefined, fallback: string) =>
    student?.fullNameEnglish ?? student?.fullNameTamil ?? fallback;

  const getContactValue = (student: ApiStudent | null | undefined, keys: string[]) => {
    if (!student) return 'N/A';

    const source = student as unknown as Record<string, unknown>;

    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }

    return 'N/A';
  };

  const getWhatsAppNumber = (student: ApiStudent | null | undefined) =>
    getContactValue(student, [
      'whatsappNo',
      'whatsAppNo',
      'whatsappNumber',
      'whatsAppNumber',
      'phone',
      'phoneNumber',
      'contactNo',
      'contactNumber',
      'mobile',
      'mobileNumber',
    ]);

  const getParentNumber = (student: ApiStudent | null | undefined) =>
    getContactValue(student, [
      'parentPhone',
      'parentContact',
      'parentContactNo',
      'guardianPhone',
      'guardianContact',
      'guardianContactNo',
      'fatherContact',
      'fatherContactNo',
      'fatherPhone',
      'motherContact',
      'motherContactNo',
      'motherPhone',
      'fixedTelephone',
    ]);

  if (loading) return (
    <div className="flex h-64 items-center justify-center p-3 sm:p-6">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-800 sm:text-2xl">Attendance</h1>
          <p className="text-xs text-gray-500 sm:text-sm">Track and manage student attendance</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-1 gap-2 md:mb-6 md:grid-cols-3 md:gap-4">
        <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 sm:h-10 sm:w-10 sm:rounded-xl"><Users className="h-4 w-4 text-indigo-600 sm:h-5 sm:w-5" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 sm:text-sm sm:font-normal sm:normal-case sm:tracking-normal">Total Students</p><p className="text-lg font-bold text-gray-800 sm:text-xl">{totalStudents}</p></div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 sm:h-10 sm:w-10 sm:rounded-xl"><CheckCircle className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 sm:text-sm sm:font-normal sm:normal-case sm:tracking-normal">Present Today</p><p className="text-lg font-bold text-gray-800 sm:text-xl">{totalPresent}</p></div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 sm:h-10 sm:w-10 sm:rounded-xl"><XCircle className="h-4 w-4 text-red-600 sm:h-5 sm:w-5" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 sm:text-sm sm:font-normal sm:normal-case sm:tracking-normal">Absent Today</p><p className="text-lg font-bold text-gray-800 sm:text-xl">{totalAbsent}</p></div>
          </div>
        </div>
      </div>

    
      <div className="relative z-30 mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Filter className="hidden w-4 flex-shrink-0 text-gray-400 sm:block" />
          <div className="relative min-w-0">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} max={today}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-auto sm:rounded-xl sm:text-sm" />
          </div>
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-indigo-600 hover:underline sm:bg-transparent sm:px-0 sm:text-sm"
            >
              Clear Filter
            </button>
          )}

          <CompactSelect
            value={filterBatch}
            onChange={setFilterBatch}
            options={[
              { value: '', label: 'All Batches' },
              ...BATCHES.map(batch => ({
                value: batch,
                label: batch,
              })),
            ]}
          />
          <CompactSelect
            value={filterModule}
            onChange={setFilterModule}
            className="col-span-2 sm:col-span-1"
            options={[
              { value: '', label: 'All Modules' },
              ...modules.map(module => ({
                value: module._id,
                label: module.name,
              })),
            ]}
          />
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {Object.entries(groupedByModule).map(([moduleName, records]) => {
          const isExpanded = expandedModules.has(moduleName);
          const presentCount = records.filter(r => r.status === 'present').length;
          const absentCount = records.filter(r => r.status === 'absent').length;
          const moduleObj = modules.find(m => m.name === moduleName || m._id === records[0]?.moduleId);
          const batchName = moduleObj?.batch ?? 'Batch';

          return (
            <section key={moduleName} className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => toggleModule(moduleName)}
                className="flex w-full items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-left"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  <span className="truncate text-xs font-bold text-gray-800">{moduleName}</span>
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">{batchName}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold">
                  <span className="text-emerald-600">P:{presentCount}</span>
                  <span className="text-red-500">A:{absentCount}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {records.map(record => {
                    const student = students.find(s => s.studentId === record.studentId);
                    const studentName = student?.fullNameEnglish ?? record.studentId;
                    const displayDate = formatDate(record.sessionDate || record.date);

                    return (
                      <article key={record._id} className="p-3">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Student Name</p>
                            {record.status === 'absent' ? (
                              <button
                                type="button"
                                onClick={() => setContactTarget({ student: student ?? null, record })}
                                className="block max-w-full truncate text-left text-xs font-bold text-indigo-600 hover:underline"
                                title="View contact details"
                              >
                                {studentName}
                              </button>
                            ) : (
                              <p className="truncate text-xs font-bold text-gray-800">{studentName}</p>
                            )}
                            <p className="mt-0.5 text-[10px] font-medium text-gray-500">{record.studentId}</p>
                          </div>
                          <span className={`shrink-0 rounded px-2 py-1 text-[9px] font-bold uppercase ${
                            record.status === 'present'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-red-50 text-red-500'
                          }`}>
                            {record.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-end justify-between gap-2">
                          <div className="grid grid-cols-2 gap-6 text-[10px]">
                            <div>
                              <p className="font-bold uppercase tracking-wide text-gray-400">Date</p>
                              <p className="mt-1 font-medium text-gray-600">{displayDate}</p>
                            </div>
                            <div>
                              <p className="font-bold uppercase tracking-wide text-gray-400">Time</p>
                              <p className="mt-1 font-medium text-gray-600">{formatTime(record.markedAt)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleMarkAttendance(record, 'present')}
                              className={`flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold ${
                                record.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-50 text-gray-400'
                              }`}
                            >
                              P
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkAttendance(record, 'absent')}
                              className={`flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold ${
                                record.status === 'absent'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-50 text-gray-400'
                              }`}
                            >
                              A
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(record)}
                              className="flex h-7 w-7 items-center justify-center rounded bg-gray-50 text-red-400"
                              aria-label="Delete record"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/attendance/student/${record.studentId}`)}
                              className="flex h-7 w-7 items-center justify-center rounded bg-gray-50 text-indigo-400"
                              aria-label="View history"
                            >
                              <History size={13} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {Object.keys(groupedByModule).length === 0 && (
          <div className="rounded-lg border border-gray-100 bg-white py-12 text-center text-gray-400">
            <Calendar className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">No attendance records found</p>
            <p className="mt-1 text-xs">
              {attendances.length > 0 ? 'Try adjusting your filters' : 'No attendance marked for this date'}
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-12 px-4 py-3" />
                <th className="w-[300px] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Module</th>
                <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch</th>
                <th className="w-[120px] px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Present</th>
                <th className="w-[120px] px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Absent</th>
                <th className="w-[150px] px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Students</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedByModule).map(([moduleName, records]) => {
                const isExpanded = expandedModules.has(moduleName);
                const presentCount = records.filter(r => r.status === 'present').length;
                const absentCount = records.filter(r => r.status === 'absent').length;
                const uniqueStudents = new Set(records.map(r => r.studentId)).size;
                const moduleObj = modules.find(m => m.name === moduleName || m._id === records[0]?.moduleId);
                const batchName = moduleObj?.batch ?? '—';

                return (
                  <Fragment key={moduleName}>
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleModule(moduleName)}
                    >
                      <td className="px-4 py-3 text-center">
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{moduleName}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{batchName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{presentCount}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{absentCount}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium text-gray-600">{uniqueStudents}</td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-0 border-b border-gray-100">
                          <div className="bg-gray-50">
                            <table className="w-full table-fixed">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="w-[150px] pl-12 pr-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                                  <th className="w-[150px] px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Student ID</th>
                                  <th className="w-[200px] px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Student Name</th>
                                  <th className="w-[150px] px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</th>
                                  <th className="w-[120px] px-4 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                                  <th className="w-[150px] px-4 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {records.map(record => {
                                  const student = students.find(s => s.studentId === record.studentId);
                                  const studentName = student?.fullNameEnglish ?? record.studentId;
                                  const displayDate = formatDate(record.sessionDate || record.date);
                                  return (
                                    <tr key={record._id} className="hover:bg-white transition-colors">
                                      <td className="pl-12 pr-4 py-2.5 text-xs text-gray-600">{displayDate}</td>
                                      <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{record.studentId}</td>
                                      <td className="px-4 py-2.5 text-xs text-gray-700">
                                        {record.status === 'absent' ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setContactTarget({ student: student ?? null, record });
                                            }}
                                            className="font-semibold text-indigo-600 hover:underline"
                                            title="View contact details"
                                          >
                                            {studentName}
                                          </button>
                                        ) : (
                                          studentName
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-gray-500">{formatTime(record.markedAt)}</td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                          record.status === 'present'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                          {record.status === 'present' ? 'PRESENT' : 'ABSENT'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleMarkAttendance(record, 'present')}
                                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                              record.status === 'present'
                                                ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                                                : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                                            }`}
                                          >
                                            P
                                          </button>
                                          <button
                                            onClick={() => handleMarkAttendance(record, 'absent')}
                                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                              record.status === 'absent'
                                                ? 'bg-red-100 text-red-700 ring-2 ring-red-400'
                                                : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'
                                            }`}
                                          >
                                            A
                                          </button>
                                          <button
                                            onClick={() => setDeleteTarget(record)}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete record"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/attendance/student/${record.studentId}`); }}
                                            className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            title="View History"
                                          >
                                            <History size={14} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {Object.keys(groupedByModule).length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No attendance records found</p>
              <p className="text-xs mt-1">
                {attendances.length > 0 ? 'Try adjusting your filters' : 'No attendance marked for this date'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-emerald-500 rounded text-white text-xs flex items-center justify-center font-bold">P</span> Present</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">A</span> Absent</span>
        <span className="flex items-center gap-1.5"><span className="text-gray-300">—</span> Not enrolled</span>
      </div>

      <button
        type="button"
        onClick={() => router.push('/dashboard/qr-scan')}
        className="fixed bottom-5 right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 md:hidden"
        aria-label="Scan QR"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Absent Student Contact Modal */}
      {contactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-500">
                  Absent Student Contact
                </p>
                <h2 className="mt-1 text-lg font-bold text-gray-800">
                  {getStudentName(contactTarget.student ?? undefined, contactTarget.record.studentId)}
                </h2>
                <p className="text-xs font-medium text-gray-400">
                  Student ID: {contactTarget.record.studentId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setContactTarget(null)}
                className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close contact details"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  WhatsApp Number
                </p>
                <p className="mt-1 text-sm font-bold text-gray-800">
                  {getWhatsAppNumber(contactTarget.student)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Parent / Guardian Phone
                </p>
                <p className="mt-1 text-sm font-bold text-gray-800">
                  {getParentNumber(contactTarget.student)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setContactTarget(null)}
              className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={!!deleteTarget}
        message={`Delete attendance record for ${
          students.find(s => s.studentId === deleteTarget?.studentId)?.fullNameEnglish
          ?? deleteTarget?.studentId
          ?? 'this student'
        }?`}
        loading={deleteLoading}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            setDeleteLoading(true);
            await deleteAttendance(deleteTarget._id);
            addToast('Record deleted', 'success');
            setDeleteTarget(null);
            await fetchAttendance(filterDate || undefined);
          } catch {
            addToast('Failed to delete attendance', 'error');
          } finally {
            setDeleteLoading(false);
          }
        }}
      />
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}