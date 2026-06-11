'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getStudentAttendance, updateAttendance, deleteAttendance, extractErrorMessage,
  type ApiAttendance,
} from '@/lib/api';
import DeleteModal from '@/components/common/DeleteModal';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/common/Toast';
import { Trash2, ArrowLeft, CheckCircle, XCircle, Users, BarChart2, Calendar, Filter } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const YEARS = [2024, 2025, 2026];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function StudentAttendancePage() {
  const { toasts, addToast, removeToast } = useToast();
  const params = useParams();
  const router = useRouter();
  const studentId = (params?.studentId ?? '') as string;

  const [records, setRecords] = useState<ApiAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [deleteTarget, setDeleteTarget] = useState<ApiAttendance | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getStudentAttendance(studentId)
      .then(data => { setRecords(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { addToast('Failed to load attendance', 'error'); setLoading(false); });
  }, [studentId]);

  const handleMark = async (record: ApiAttendance, status: 'present' | 'absent') => {
    if (record.status === status) return;
    try {
      await updateAttendance(record._id, { status });
      addToast(`Marked as ${status}`, 'success');
      setRecords(prev => prev.map(r => r._id === record._id ? { ...r, status } : r));
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    }
  };

  const filtered = records.filter(r => {
    const d = new Date(r.sessionDate ?? r.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const totalPresent = records.filter(r => r.status === 'present').length;
  const totalAbsent = records.filter(r => r.status === 'absent').length;
  const totalClasses = records.length;
  const attendancePct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

  const studentName = studentId;

  if (loading) return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-40" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
            <div className="h-10 bg-gray-200 rounded mb-2" />
            <div className="h-6 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-700 font-bold text-sm">{getInitials(studentName)}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{studentName}</h1>
            <p className="text-xs text-gray-500">{studentId}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Classes</p>
              <p className="text-xl font-bold text-gray-800">{totalClasses}</p>
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
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Attendance %</p>
              <p className="text-xl font-bold text-gray-800">{attendancePct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto text-xs text-gray-400 flex items-center">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''} in {MONTHS[selectedMonth]} {selectedYear}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="w-[220px] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Module</th>
                <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                <th className="w-[120px] px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="w-[160px] px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(record => (
                <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {formatDate(record.sessionDate ?? record.date)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">{record.moduleName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">—</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      record.status === 'present'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {record.status === 'present' ? 'Present' : 'Absent'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleMark(record, 'present')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          record.status === 'present'
                            ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                            : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                        }`}
                      >
                        P
                      </button>
                      <button
                        onClick={() => handleMark(record, 'absent')}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No attendance records found</p>
              <p className="text-xs mt-1">
                {records.length > 0 ? 'Try a different month or year' : 'No attendance records for this student'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 bg-emerald-500 rounded text-white text-xs flex items-center justify-center font-bold">P</span> Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">A</span> Absent
        </span>
      </div>

      <DeleteModal
        open={!!deleteTarget}
        message={`Delete attendance record for ${deleteTarget?.studentId ?? 'this student'} on ${deleteTarget ? formatDate(deleteTarget.sessionDate ?? deleteTarget.date) : ''}?`}
        loading={deleteLoading}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            setDeleteLoading(true);
            await deleteAttendance(deleteTarget._id);
            addToast('Record deleted', 'success');
            setRecords(prev => prev.filter(r => r._id !== deleteTarget._id));
            setDeleteTarget(null);
          } catch (err) {
            addToast(extractErrorMessage(err), 'error');
          } finally {
            setDeleteLoading(false);
          }
        }}
      />
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
