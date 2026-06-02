'use client';
import { useState } from 'react';
import { useDataStore } from '../store/dataStore';
import StudentProfile from '../components/students/StudentProfile';
import type { Student, PaymentRecord } from '../types';
import { QrCode, Search, ScanLine } from 'lucide-react';

export default function QRScanPage() {
  const { students } = useDataStore();
  const [query, setQuery] = useState('');
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);

  const handleSearch = () => {
    if (!query.trim()) return;
    const found = students.find(s =>
      s.studentId.toLowerCase() === query.toLowerCase() ||
      s.name.toLowerCase().includes(query.toLowerCase())
    );
    if (found) setScannedStudent(found);
  };

  const handlePaymentAdd = (payment: Omit<PaymentRecord, 'id'>) => {
    useDataStore.getState().addPayment(scannedStudent!.id, payment);
  };
  const handleAttendanceUpdate = (moduleId: string, date: string, status: 'present' | 'absent') => {
    useDataStore.getState().updateAttendance(scannedStudent!.id, moduleId, date, status);
  };

  const currentStudent = scannedStudent ? students.find(s => s.id === scannedStudent.id) || scannedStudent : null;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">QR Scanner</h1>
        <p className="text-gray-500 text-sm mt-1">Enter Student ID or name to load profile</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Student ID (e.g. May24#0001) or name..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <button onClick={handleSearch} className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Access</p>
          <div className="grid grid-cols-1 gap-2">
            {students.slice(0, 5).map(s => (
              <button key={s.id} onClick={() => setScannedStudent(s)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{s.studentId}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {s.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {currentStudent && (
        <StudentProfile
          student={currentStudent}
          onClose={() => setScannedStudent(null)}
          onPaymentAdd={handlePaymentAdd}
          onAttendanceUpdate={handleAttendanceUpdate}
        />
      )}
    </div>
  );
}
