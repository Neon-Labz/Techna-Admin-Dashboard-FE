'use client';
import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, PaymentRecord } from '../../types';
import { useDataStore } from '../../store/dataStore';
import { X, Download, CheckCircle, XCircle, Plus, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

interface Props {
  student: Student;
  onClose: () => void;
  onPaymentAdd: (p: Omit<PaymentRecord, 'id'>) => void;
  onAttendanceUpdate: (moduleId: string, date: string, status: 'present' | 'absent') => void;
}

export default function StudentProfile({ student, onClose, onPaymentAdd, onAttendanceUpdate }: Props) {
  const { modules } = useDataStore();
  const qrRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState<{ moduleId: string; amount: string; method: 'cash' | 'bank' | 'online'; paidDate: string }>({ moduleId: '', amount: '', method: 'cash', paidDate: new Date().toISOString().split('T')[0] });
  const today = new Date().toISOString().split('T')[0];

  const studentModules = modules.filter(m => student.modules.includes(m.id));

  const qrData = JSON.stringify({
    studentId: student.studentId,
    name: student.name,
    phone: student.phone,
    batch: student.batch,
    modules: studentModules.map(m => m.name),
  });

  const getAttendanceStatus = (moduleId: string) => {
    const rec = student.attendance.find(a => a.moduleId === moduleId && a.date === today);
    return rec?.status || null;
  };

  const getModulePayment = (moduleId: string) => {
    return student.payments.find(p => p.moduleId === moduleId && p.status === 'paid');
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    toast.loading('Generating PDF...');
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`${student.studentId}-card.pdf`);
      toast.dismiss();
      toast.success('PDF downloaded!');
    } catch {
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mod = modules.find(m => m.id === payForm.moduleId);
    if (!mod) return;
    onPaymentAdd({
      studentId: student.id,
      studentName: student.name,
      moduleId: payForm.moduleId,
      moduleName: mod.name,
      amount: Number(payForm.amount),
      paidDate: payForm.paidDate,
      method: payForm.method,
      status: 'paid',
      receiptNo: `REC-${Date.now()}`,
      batch: student.batch,
    });
    setShowPayModal(false);
    setPayForm({ moduleId: '', amount: '', method: 'cash', paidDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-gray-50 rounded-2xl shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-white border-b border-gray-100 rounded-t-2xl sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-800">Student Profile</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Download className="w-4 h-4" /> Download QR Card
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* QR Card Preview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Student ID Card (PDF Preview)</h3>
            <div ref={cardRef} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100" style={{ fontFamily: 'sans-serif' }}>
              {/* Card Header */}
              <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{student.name}</h2>
                    <p className="text-indigo-200 text-sm font-mono">{student.studentId}</p>
                    <p className="text-indigo-200 text-xs mt-0.5">{student.batch}</p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex gap-4">
                {/* Details */}
                <div className="flex-1 space-y-2 text-sm">
                  <div><span className="text-gray-400 text-xs">Phone</span><p className="font-medium text-gray-800">{student.phone}</p></div>
                  <div><span className="text-gray-400 text-xs">Email</span><p className="font-medium text-gray-800 text-xs">{student.email}</p></div>
                  <div><span className="text-gray-400 text-xs">Status</span>
                    <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${student.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{student.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Modules</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {studentModules.map(m => (
                        <span key={m.id} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{m.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* QR */}
                <div className="flex-shrink-0" ref={qrRef}>
                  <div className="p-2 bg-white border border-gray-200 rounded-xl">
                    <QRCodeSVG value={qrData} size={100} level="M" />
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-1">Scan for details</p>
                </div>
              </div>

              {/* Attendance Footer */}
              <div className="border-t border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attendance (Today)</p>
                <div className="space-y-1.5">
                  {studentModules.map(m => {
                    const att = getAttendanceStatus(m.id);
                    return (
                      <div key={m.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{m.name}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => onAttendanceUpdate(m.id, today, 'present')}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${att === 'present' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700'}`}>
                            Present
                          </button>
                          <button onClick={() => onAttendanceUpdate(m.id, today, 'absent')}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${att === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'}`}>
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* School branding */}
              <div className="bg-indigo-50 px-4 py-2 text-center">
                <p className="text-xs text-indigo-400">Techna · School Management System</p>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-5">
            {/* Payment Section */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-500" /> Payments</h3>
                <button onClick={() => setShowPayModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
                  <Plus className="w-3 h-3" /> Add Payment
                </button>
              </div>

              <div className="space-y-2">
                {studentModules.map(m => {
                  const paid = getModulePayment(m.id);
                  return (
                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl ${paid ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                      <span className="text-sm font-medium text-gray-700">{m.name}</span>
                      {paid ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-600 font-medium">LKR {paid.amount.toLocaleString()}</span>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400">Unpaid</span>
                          <XCircle className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {student.payments.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No payment records</p>}
              </div>

              {/* All payments history */}
              {student.payments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment History</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {student.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{p.moduleName}</span>
                        <span className="text-gray-500">{p.paidDate}</span>
                        <span className="font-medium text-emerald-600">LKR {p.amount.toLocaleString()}</span>
                        <span className="text-gray-400 capitalize">{p.method}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Attendance History */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">Attendance History</h3>
              {student.attendance.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No attendance records</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...student.attendance].sort((a, b) => b.date.localeCompare(a.date)).map(a => (
                    <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50">
                      <span className="font-medium text-gray-700">{a.moduleName}</span>
                      <span className="text-gray-400 text-xs">{a.date}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {a.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Student Details */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">Personal Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Date of Birth', student.dob],
                  ['Address', student.address],
                  ['Parent Name', student.parentName || 'N/A'],
                  ['Parent Phone', student.parentPhone || 'N/A'],
                  ['Enrolled', new Date(student.enrolledAt).toLocaleDateString()],
                  ['Approved', student.approvedAt ? new Date(student.approvedAt).toLocaleDateString() : 'Not yet'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-medium text-gray-700">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPayModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowPayModal(false)} />
            <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-bold text-gray-800 mb-4">Add Payment</h3>
              <form onSubmit={handlePaySubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                  <select required value={payForm.moduleId} onChange={e => setPayForm(f => ({ ...f, moduleId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    <option value="">Select module...</option>
                    {studentModules.map(m => <option key={m.id} value={m.id}>{m.name} (LKR {m.fee.toLocaleString()})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR)</label>
                  <input type="number" required value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value as 'cash' | 'bank' | 'online' }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={payForm.paidDate} onChange={e => setPayForm(f => ({ ...f, paidDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Record Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
