import { useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { Calendar, Filter, Search, CheckCircle, XCircle, Users } from 'lucide-react';

const BATCHES = ['', 'May 2024 Batch', 'September 2024 Batch', 'January 2025 Batch', 'May 2025 Batch'];

export default function AttendancePage() {
  const { students, modules, updateAttendance } = useDataStore();
  const [filterBatch, setFilterBatch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  const filteredStudents = students.filter(s => {
    const matchBatch = !filterBatch || s.batch === filterBatch;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase());
    const matchModule = !filterModule || s.modules.includes(filterModule);
    return matchBatch && matchSearch && matchModule && s.status === 'approved';
  });

  const getAttStatus = (studentId: string, moduleId: string) => {
    const student = students.find(s => s.id === studentId);
    const rec = student?.attendance.find(a => a.moduleId === moduleId && a.date === filterDate);
    return rec?.status || null;
  };

  const selectedModules = filterModule
    ? modules.filter(m => m.id === filterModule)
    : modules;

  const totalPresent = filteredStudents.reduce((sum, s) => {
    const count = selectedModules.filter(m => {
      const att = s.attendance.find(a => a.moduleId === m.id && a.date === filterDate);
      return att?.status === 'present' && s.modules.includes(m.id);
    }).length;
    return sum + count;
  }, 0);

  const totalAbsent = filteredStudents.reduce((sum, s) => {
    const count = selectedModules.filter(m => {
      const att = s.attendance.find(a => a.moduleId === m.id && a.date === filterDate);
      return att?.status === 'absent' && s.modules.includes(m.id);
    }).length;
    return sum + count;
  }, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
          <p className="text-gray-500 text-sm">Track and manage student attendance</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-indigo-600" /></div>
            <div><p className="text-sm text-gray-500">Approved Students</p><p className="text-xl font-bold text-gray-800">{filteredStudents.length}</p></div>
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
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {BATCHES.map(b => <option key={b} value={b}>{b || 'All Batches'}</option>)}
          </select>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Modules</option>
            {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch</th>
                {selectedModules.filter(m => !filterModule || m.id === filterModule).map(m => (
                  <th key={m.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.map(s => {
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.studentId}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.batch}</td>
                    {selectedModules.filter(m => !filterModule || m.id === filterModule).map(m => {
                      const enrolled = s.modules.includes(m.id);
                      if (!enrolled) return (
                        <td key={m.id} className="px-4 py-3 text-center">
                          <span className="text-xs text-gray-300">—</span>
                        </td>
                      );
                      const status = getAttStatus(s.id, m.id);
                      return (
                        <td key={m.id} className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => updateAttendance(s.id, m.id, filterDate, 'present')}
                              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${status === 'present' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700'}`}>
                              P
                            </button>
                            <button
                              onClick={() => updateAttendance(s.id, m.id, filterDate, 'absent')}
                              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'}`}>
                              A
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No approved students found</p>
              <p className="text-xs mt-1">Approve students in the Students section first</p>
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
    </div>
  );
}
