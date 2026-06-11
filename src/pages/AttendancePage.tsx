'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Filter, Search, CheckCircle, XCircle,
  Users, Trash2, Loader2, RefreshCw,
} from 'lucide-react';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';
import { attendanceApi } from '@/api/attendance.api';

const BATCHES = [
  '',
  'May 2024 Batch',
  'September 2024 Batch',
  'January 2025 Batch',
  'May 2025 Batch',
];

// ── Types ────────────────────────────────────────────────────────────────────

interface AttendanceItem {
  id: string;
  studentId: string;
  moduleId: string;
  moduleName: string;
  date: string;
  status: 'present' | 'absent';
  markedAt: string;
}

interface StudentReportRow {
  studentId: string;
  name: string;
  batch: string;
  modules: string[];
  attendance: AttendanceItem[];
}

interface AttendanceReport {
  summary: {
    totalStudents: number;
    totalRecords: number;
    present: number;
    absent: number;
  };
  students: StudentReportRow[];
}

interface ModuleOption {
  id: string;
  name: string;
}

interface DeleteTarget {
  recordId: string;
  studentId: string;
  studentName: string;
  moduleName: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [moduleOptions, setModuleOptions] = useState<ModuleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterBatch, setFilterBatch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  // Always plain YYYY-MM-DD
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [search, setSearch] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // ─── Fetch modules list for the filter dropdown ───────────────────────────
  useEffect(() => {
    const loadModules = async () => {
      try {
        const data = await attendanceApi.getModules();
        if (Array.isArray(data)) {
          setModuleOptions(
            data.map((m: any) => ({
              id: m._id ?? m.id,
              name: m.name ?? m.moduleName,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load modules:', err);
      }
    };
    loadModules();
  }, []);

  // ─── Fetch attendance report ──────────────────────────────────────────────
  // NOTE: filterDate is always YYYY-MM-DD from the <input type="date">.
  // Backend buildDateFilter does an exact string match against the stored date field.
  // BUT the stored date is a full ISO string ("2026-06-11T00:00:00.000Z").
  // So we send BOTH `date` (exact match, catches plain-date records) AND
  // `from`/`to` spanning the full day (catches ISO-string records).
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        // Send plain date — works if backend stored date as plain YYYY-MM-DD
        date: filterDate,
      };
      if (filterModule) params.moduleId = filterModule;
      if (filterBatch)  params.batch    = filterBatch;

      const response = await attendanceApi.getReport(params);
      setReport(response as AttendanceReport);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      setError('Failed to load attendance data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterModule, filterBatch]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const students: StudentReportRow[] = report?.students ?? [];

  const reportModules = Array.from(
    new Map(
      students
        .flatMap((s) => s.attendance)
        .map((a) => [a.moduleId, { id: a.moduleId, name: a.moduleName }])
    ).values()
  );

  const allModules: ModuleOption[] = Array.from(
    new Map(
      [...moduleOptions, ...reportModules].map((m) => [m.id, m])
    ).values()
  );

  const filteredStudents = students.filter((s) => {
    if (!search) return true;
    return (
      s.studentId.toLowerCase().includes(search.toLowerCase()) ||
      (s.name ?? '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const selectedModules = filterModule
    ? allModules.filter((m) => m.id === filterModule)
    : allModules;

  const totalPresent = report?.summary?.present ?? 0;
  const totalAbsent  = report?.summary?.absent  ?? 0;

  const getRecord = (
    student: StudentReportRow,
    moduleId: string
  ): AttendanceItem | null =>
    student.attendance.find((a) => a.moduleId === moduleId) ?? null;

  // ─── Mark attendance ──────────────────────────────────────────────────────
  // Always calls markAttendance — the API handles 409 (already exists) internally
  // by auto-patching the existing record. No need to branch POST vs PATCH here.
  const handleMark = async (
    student: StudentReportRow,
    moduleId: string,
    moduleName: string,
    status: 'present' | 'absent'
  ) => {
    const key = `${student.studentId}-${moduleId}`;
    const existing = getRecord(student, moduleId);

    setSavingKey(key);
    try {
      if (existing) {
        // Record already in local state — PATCH directly
        await attendanceApi.updateAttendance(existing.id, { status });
        setReport((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            students: prev.students.map((s) =>
              s.studentId === student.studentId
                ? {
                    ...s,
                    attendance: s.attendance.map((a) =>
                      a.moduleId === moduleId ? { ...a, status } : a
                    ),
                  }
                : s
            ),
          };
        });
      } else {
        // No record in local state → POST (API will auto-patch on 409)
        const created = await attendanceApi.markAttendance({
          studentId:  student.studentId,
          moduleId,
          moduleName,
          date:       filterDate, // plain YYYY-MM-DD — api converts to ISO for POST
          status,
        }) as AttendanceItem & { _id?: string; moduleName?: string };

        const newItem: AttendanceItem = {
          id:         (created as any)._id ?? (created as any).id ?? '',
          studentId:  student.studentId,
          moduleId,
          moduleName: created.moduleName ?? moduleName,
          date:       filterDate,
          status,
          markedAt:   new Date().toISOString(),
        };

        setReport((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            summary: {
              ...prev.summary,
              present: status === 'present' ? prev.summary.present + 1 : prev.summary.present,
              absent:  status === 'absent'  ? prev.summary.absent  + 1 : prev.summary.absent,
            },
            students: prev.students.map((s) =>
              s.studentId === student.studentId
                ? { ...s, attendance: [...s.attendance, newItem] }
                : s
            ),
          };
        });
      }
    } catch (err) {
      console.error('Failed to save attendance:', err);
      toast('Failed to save. Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  // Simple fallback if react-hot-toast isn't available
  function toast(msg: string) {
    alert(msg);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDeleteClick = (
    student: StudentReportRow,
    record: AttendanceItem
  ) => {
    setDeleteTarget({
      recordId:    record.id,
      studentId:   student.studentId,
      studentName: student.name ?? student.studentId,
      moduleName:  record.moduleName,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await attendanceApi.deleteAttendance(deleteTarget.recordId);
      setReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map((s) =>
            s.studentId === deleteTarget.studentId
              ? {
                  ...s,
                  attendance: s.attendance.filter(
                    (a) => a.id !== deleteTarget.recordId
                  ),
                }
              : s
          ),
        };
      });
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete. Please try again.');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
          <p className="text-gray-500 text-sm">
            Track and manage student attendance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 text-indigo-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          )}
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Students</p>
              <p className="text-xl font-bold text-gray-800">{filteredStudents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Present</p>
              <p className="text-xl font-bold text-gray-800">{totalPresent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Absent</p>
              <p className="text-xl font-bold text-gray-800">{totalAbsent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student ID or name…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {BATCHES.map((b) => (
              <option key={b} value={b}>{b || 'All Batches'}</option>
            ))}
          </select>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Modules</option>
            {allModules.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Batch
                </th>
                {selectedModules.map((m) => (
                  <th key={m.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {m.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.map((s) => (
                <tr key={s.studentId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {(s.name ?? s.studentId).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.name ?? s.studentId}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.batch || 'N/A'}</td>

                  {selectedModules.map((m) => {
                    const rec      = getRecord(s, m.id);
                    const isSaving = savingKey === `${s.studentId}-${m.id}`;
                    return (
                      <td key={m.id} className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          ) : (
                            <>
                              <button
                                onClick={() => handleMark(s, m.id, m.name, 'present')}
                                className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                                  rec?.status === 'present'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700'
                                }`}
                              >
                                P
                              </button>
                              <button
                                onClick={() => handleMark(s, m.id, m.name, 'absent')}
                                className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
                                  rec?.status === 'absent'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'
                                }`}
                              >
                                A
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  <td className="px-4 py-3 text-center">
                    {s.attendance.length > 0 ? (
                      <button
                        onClick={() => {
                          const rec = s.attendance.find(
                            (a) => !filterModule || a.moduleId === filterModule
                          );
                          if (rec) handleDeleteClick(s, rec);
                        }}
                        title="Delete attendance record"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && filteredStudents.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No attendance records found for this date</p>
              <p className="text-xs mt-1">
                Try a different date or check if attendance has been marked
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 bg-emerald-500 rounded text-white text-xs flex items-center justify-center font-bold">P</span>
          Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">A</span>
          Absent
        </span>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        message={
          deleteTarget
            ? `Delete attendance record for ${deleteTarget.studentName} in ${deleteTarget.moduleName} on ${filterDate}?`
            : ''
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}