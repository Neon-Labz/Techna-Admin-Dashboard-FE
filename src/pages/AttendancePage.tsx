'use client';
import { Fragment, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getModules, getStudents, getAttendance, createAttendance,
  updateAttendance as apiUpdateAttendance, deleteAttendance,
  type ApiModule, type ApiStudent, type ApiAttendance,
} from '@/lib/api';
import { Calendar, Filter, Search, CheckCircle, XCircle, Users, ChevronDown, Trash2, History } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/common/Toast';
import DeleteModal from '@/components/common/DeleteModal';

const BATCHES = ['', 'May 2024 Batch', 'September 2024 Batch', 'January 2025 Batch', 'May 2025 Batch'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function AttendancePage() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();
  // ── Existing state ──────────────────────────────────────────────────────────
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [attendances, setAttendances] = useState<ApiAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBatch, setFilterBatch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  // ── Collapsible row state ───────────────────────────────────────────────────
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // ── Delete modal state ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<ApiAttendance | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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


  // ── markAttendance (keep existing logic) ────────────────────────────────────
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

  // ── Grouped data for collapsible table ──────────────────────────────────────
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

  // ── Summary counts — derived from filteredAttendances (same source as table) ─
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

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
          <p className="text-gray-500 text-sm">Track and manage student attendance</p>
        </div>
      </div>

      {/* Summary cards (unchanged) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-indigo-600" /></div>
            <div><p className="text-sm text-gray-500">Total Students</p><p className="text-xl font-bold text-gray-800">{totalStudents}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Present Today</p><p className="text-xl font-bold text-gray-800">{totalPresent}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Absent Today</p><p className="text-xl font-bold text-gray-800">{totalAbsent}</p></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} max={today}
              className="pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-sm text-indigo-600 hover:underline"
            >
              Clear
            </button>
          )}
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {BATCHES.map(b => <option key={b} value={b}>{b || 'All Batches'}</option>)}
          </select>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Modules</option>
            {modules.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {/* Collapsible Attendance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                    {/* Outer row */}
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

                    {/* Inner expanded table */}
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
                                      <td className="px-4 py-2.5 text-xs text-gray-700">{studentName}</td>
                                      <td className="px-4 py-2.5 text-xs text-gray-500">—</td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                          record.status === 'present'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                          {record.status === 'present' ? 'Present' : 'Absent'}
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

      {/* Attendance Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-emerald-500 rounded text-white text-xs flex items-center justify-center font-bold">P</span> Present</span>
        <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">A</span> Absent</span>
        <span className="flex items-center gap-1.5"><span className="text-gray-300">—</span> Not enrolled</span>
      </div>

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
