'use client';
import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, PaymentRecord } from '../../types';
import { useDataStore } from '../../store/dataStore';
import { X, Download, CheckCircle, XCircle, Plus, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

const PDF_COLORS = {
  cardBorder: '#e5e7eb',
  cardText: '#374151',
  mutedText: '#6b7280',
  headerBg: '#4f46e5',
  headerText: '#ffffff',
  avatarBg: 'rgba(255,255,255,0.2)',
  avatarText: '#ffffff',
  studentIdText: '#c7d2fe',
  chipBg: '#e0e7ff',
  chipText: '#4338ca',
  footerBg: '#eef2ff',
  footerText: '#818cf8',
  statusApprovedBg: '#d1fae5',
  statusApprovedText: '#047857',
  statusPendingBg: '#fef3c7',
  statusPendingText: '#b45309',
  presentBg: '#10b981',
  absentBg: '#ef4444',
  neutralBg: '#f3f4f6',
  neutralText: '#6b7280',
};

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
  const toastId = toast.loading('Generating PDF...');

  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const qrImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageWidth, 28, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Student ID Card', pageWidth / 2, 12, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Techna · School Management System', pageWidth / 2, 20, { align: 'center' });

    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text(student.name, 14, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Student ID: ${student.studentId}`, 14, 49);
    pdf.text(`Batch: ${student.batch}`, 14, 55);
    pdf.text(`Phone: ${student.phone}`, 14, 67);
    pdf.text(`Email: ${student.email}`, 14, 73);
    pdf.text(`Status: ${student.status}`, 14, 79);

    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(pageWidth - 52, 36, 36, 36, 3, 3, 'S');
    pdf.addImage(qrImage, 'PNG', pageWidth - 50, 38, 32, 32);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Modules', 14, 92);
    pdf.setFont('helvetica', 'normal');
    let y = 100;
    studentModules.forEach((module) => {
      pdf.setFillColor(224, 231, 255);
      pdf.roundedRect(14, y - 4, 38, 7, 2, 2, 'F');
      pdf.setTextColor(67, 56, 202);
      pdf.setFontSize(8);
      pdf.text(module.name, 16, y);
      y += 10;
    });

    pdf.setDrawColor(229, 231, 235);
    pdf.line(14, pageHeight - 34, pageWidth - 14, pageHeight - 34);
    pdf.setTextColor(75, 85, 99);
    pdf.setFontSize(9);
    pdf.text('Attendance (Today)', 14, pageHeight - 28);

    let attendanceY = pageHeight - 20;
    studentModules.forEach((module) => {
      const status = getAttendanceStatus(module.id);
      pdf.setTextColor(55, 65, 81);
      pdf.text(module.name, 14, attendanceY);
      pdf.setTextColor(status === 'present' ? 16 : 17, status === 'present' ? 185 : 24, status === 'present' ? 129 : 39);
      pdf.text(status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Not marked', pageWidth - 42, attendanceY);
      attendanceY += 7;
    });

    pdf.save(`${student.studentId}-card.pdf`);

    toast.success('PDF downloaded!', { id: toastId });
  } catch (error) {
    console.error('PDF generation failed:', error);
    toast.error('QR Download Failed', { id: toastId });
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
            <div ref={cardRef} className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ fontFamily: 'sans-serif', border: `1px solid ${PDF_COLORS.cardBorder}` }}>
              {/* Card Header */}
              <div className="p-5" style={{ background: PDF_COLORS.headerBg, color: PDF_COLORS.headerText }}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0" style={{ background: PDF_COLORS.avatarBg, color: PDF_COLORS.avatarText }}>
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{student.name}</h2>
                    <p className="text-sm font-mono" style={{ color: PDF_COLORS.studentIdText }}>{student.studentId}</p>
                    <p className="text-xs mt-0.5" style={{ color: PDF_COLORS.studentIdText }}>{student.batch}</p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex gap-4">
                {/* Details */}
                <div className="flex-1 space-y-2 text-sm">
                  <div><span className="text-xs" style={{ color: PDF_COLORS.mutedText }}>Phone</span><p className="font-medium" style={{ color: PDF_COLORS.cardText }}>{student.phone}</p></div>
                  <div><span className="text-xs" style={{ color: PDF_COLORS.mutedText }}>Email</span><p className="font-medium text-xs" style={{ color: PDF_COLORS.cardText }}>{student.email}</p></div>
                  <div><span className="text-xs" style={{ color: PDF_COLORS.mutedText }}>Status</span>
                    <span
                      className="ml-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: student.status === 'approved' ? PDF_COLORS.statusApprovedBg : PDF_COLORS.statusPendingBg,
                        color: student.status === 'approved' ? PDF_COLORS.statusApprovedText : PDF_COLORS.statusPendingText,
                      }}
                    >
                      {student.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: PDF_COLORS.mutedText }}>Modules</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {studentModules.map(m => (
                        <span key={m.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: PDF_COLORS.chipBg, color: PDF_COLORS.chipText }}>{m.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* QR */}
                <div className="shrink-0">
                  <div className="p-2 bg-white rounded-xl" style={{ border: `1px solid ${PDF_COLORS.cardBorder}` }}>
                    <QRCodeSVG value={qrData} size={100} level="M" />
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-1">Scan for details</p>
                </div>
              </div>

              {/* Attendance Footer */}
              <div className="p-4" style={{ borderTop: `1px solid ${PDF_COLORS.cardBorder}` }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: PDF_COLORS.mutedText }}>Attendance (Today)</p>
                <div className="space-y-1.5">
                  {studentModules.map(m => {
                    const att = getAttendanceStatus(m.id);
                    return (
                      <div key={m.id} className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: PDF_COLORS.cardText }}>{m.name}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => onAttendanceUpdate(m.id, today, 'present')}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium"
                            style={{
                              backgroundColor: att === 'present' ? PDF_COLORS.presentBg : PDF_COLORS.neutralBg,
                              color: att === 'present' ? '#ffffff' : PDF_COLORS.neutralText,
                            }}>
                            Present
                          </button>
                          <button onClick={() => onAttendanceUpdate(m.id, today, 'absent')}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium"
                            style={{
                              backgroundColor: att === 'absent' ? PDF_COLORS.absentBg : PDF_COLORS.neutralBg,
                              color: att === 'absent' ? '#ffffff' : PDF_COLORS.neutralText,
                            }}>
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* School branding */}
              <div className="px-4 py-2 text-center" style={{ backgroundColor: PDF_COLORS.footerBg }}>
                <p className="text-xs" style={{ color: PDF_COLORS.footerText }}>Techna · School Management System</p>
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
