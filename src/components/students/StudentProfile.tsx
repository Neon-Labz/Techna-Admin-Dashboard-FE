'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, PaymentRecord } from '../../types';
import { useDataStore } from '../../store/dataStore';
import {
  X,
  Download,
  CheckCircle,
  XCircle,
  Plus,
  CreditCard,
} from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

interface Props {
  student: Student;
  onClose: () => void;
  onPaymentAdd: (p: Omit<PaymentRecord, 'id'>) => void;
  onAttendanceUpdate: (
    moduleId: string,
    date: string,
    status: 'present' | 'absent',
  ) => void;
}

const getValue = (value: any) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  return String(value);
};

const formatDate = (value: any) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const normalizeQrImageUrl = (value?: string) => {
  const cleaned = value?.trim().replace(/\*/g, '');
  if (!cleaned) return '';

  try {
    return new URL(cleaned).toString();
  } catch {
    return '';
  }
};

export default function StudentProfile({
  student,
  onClose,
  onPaymentAdd,
  onAttendanceUpdate,
}: Props) {
  const { modules } = useDataStore();
  const s: any = student;

  const [showPayModal, setShowPayModal] = useState(false);
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const [payForm, setPayForm] = useState<{
    moduleId: string;
    amount: string;
    method: 'cash' | 'bank' | 'online';
    paidDate: string;
  }>({
    moduleId: '',
    amount: '',
    method: 'cash',
    paidDate: new Date().toISOString().split('T')[0],
  });

  const today = new Date().toISOString().split('T')[0];

  const studentName =
    s.fullNameEnglish || s.name || s.fullNameTamil || s.email || 'Student';

  const studentModuleValues: string[] =
    Array.isArray(s.subjects) && s.subjects.length > 0
      ? s.subjects
      : Array.isArray(s.modules) && s.modules.length > 0
        ? s.modules
        : Array.isArray(s.subjectSelection?.subjects) &&
            s.subjectSelection.subjects.length > 0
          ? s.subjectSelection.subjects
          : [];

  const studentModules = studentModuleValues.map((item: string) => {
    const found = modules.find(
      (m: any) => m.id === item || m._id === item || m.name === item,
    );

    return (
      found || {
        id: item,
        name: item,
        fee: 0,
      }
    );
  });

  const qrData = JSON.stringify({
    studentId: s.studentId,
    name: studentName,
    email: s.email,
    phone: s.phone || s.whatsappNo,
    batch: s.batch,
    modules: studentModules.map((m: any) => m.name),
  });
  const qrImageUrl = normalizeQrImageUrl(s.qrCodeUrl);
  const shouldShowQrImage = Boolean(qrImageUrl) && !qrImageFailed;

  useEffect(() => {
    setQrImageFailed(false);
  }, [s.id, s._id, s.qrCodeUrl]);

  const getAttendanceStatus = (moduleId: string) => {
    const attendance = s.attendance || [];
    const rec = attendance.find(
      (a: any) => a.moduleId === moduleId && a.date === today,
    );
    return rec?.status || null;
  };

  const getModulePayment = (moduleId: string) => {
    const payments = s.payments || [];
    return payments.find(
      (p: any) => p.moduleId === moduleId && p.status === 'paid',
    );
  };

  const handleDownloadPDF = async () => {
    const toastId = toast.loading('Generating PDF...');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      const qrImage = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
      });

      pdf.setFillColor(79, 70, 229);
      pdf.rect(0, 0, pageWidth, 28, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Student ID Card', pageWidth / 2, 12, { align: 'center' });

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Techna · School Management System', pageWidth / 2, 20, {
        align: 'center',
      });

      pdf.setTextColor(31, 41, 55);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text(studentName, 14, 42);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Student ID: ${s.studentId}`, 14, 50);
      pdf.text(`Batch: ${getValue(s.batch)}`, 14, 56);
      pdf.text(`Phone: ${getValue(s.phone || s.whatsappNo)}`, 14, 68);
      pdf.text(`Email: ${getValue(s.email)}`, 14, 74);
      pdf.text(`Status: ${getValue(s.status)}`, 14, 80);
      pdf.text(
        `Modules: ${studentModules.map((m: any) => m.name).join(', ') || 'N/A'}`,
        14,
        86,
      );

      pdf.addImage(qrImage, 'PNG', pageWidth - 50, 38, 32, 32);

      pdf.save(`${s.studentId}-card.pdf`);
      toast.success('PDF downloaded!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('QR Download Failed', { id: toastId });
    }
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const mod: any = studentModules.find((m: any) => m.id === payForm.moduleId);
    if (!mod) return;

    onPaymentAdd({
      studentId: s.id || s._id,
      studentName: studentName,
      moduleId: payForm.moduleId,
      moduleName: mod.name,
      amount: Number(payForm.amount),
      paidDate: payForm.paidDate,
      method: payForm.method,
      status: 'paid',
      receiptNo: `REC-${Date.now()}`,
      batch: s.batch,
    });

    setShowPayModal(false);
    setPayForm({
      moduleId: '',
      amount: '',
      method: 'cash',
      paidDate: new Date().toISOString().split('T')[0],
    });
  };

  const personalDetails = [
    ['Full Name English', s.fullNameEnglish || s.name],
    ['Full Name Tamil', s.fullNameTamil],
    ['Email', s.email],
    ['Phone', s.phone || s.whatsappNo],
    ['WhatsApp No', s.whatsappNo],
    ['Parents No', s.parentsNo || s.parentPhone],
    ['Date of Birth', formatDate(s.dateOfBirth || s.dob)],
    ['NIC No', s.nicNo],
    ['School', s.school],
    ['Permanent Address', s.permanentAddress || s.address],
    ['Contact Address', s.contactAddress],
    ['District', s.administrativeDistrict],
    ['Postal Code', s.postalCode],
    ['Father Name', s.fatherName],
    ['Mother Name', s.motherName],
    ['Guardian Name', s.guardianName || s.parentName],
    ['Guardian Mobile', s.guardianMobile],
    ['Race', s.race],
    ['Religion', s.religion],
    ['Batch', s.batch],
    ['Status', s.status],
    ['Modules', studentModules.map((m: any) => m.name).join(', ')],
    ['Enrolled', formatDate(s.enrolledAt)],
    ['Approved', s.approvedAt ? formatDate(s.approvedAt) : 'Not yet'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-gray-50 rounded-2xl shadow-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 bg-white border-b border-gray-100 rounded-t-2xl sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-800">Student Profile</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
            >
              <Download className="w-4 h-4" />
              Download QR Card
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
              Student ID Card
            </h3>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="p-5 bg-indigo-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                    {studentName.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h2 className="text-lg font-bold">{studentName}</h2>
                    <p className="text-sm font-mono text-indigo-200">
                      {s.studentId}
                    </p>
                    <p className="text-xs text-indigo-200">{s.batch}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 flex gap-4">
                <div className="flex-1 space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-400">Phone</span>
                    <p className="font-medium text-gray-700">
                      {getValue(s.phone || s.whatsappNo)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400">Email</span>
                    <p className="font-medium text-xs text-gray-700">
                      {getValue(s.email)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400">Status</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                      {s.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400">Modules</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {studentModules.length > 0 ? (
                        studentModules.map((m: any) => (
                          <span
                            key={m.id || m.name}
                            className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700"
                          >
                            {m.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">
                          No modules selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="p-2 bg-white rounded-xl border border-gray-200">
                    {shouldShowQrImage ? (
                      <img
                        src={qrImageUrl}
                        alt="Student QR"
                        className="w-[100px] h-[100px] object-contain"
                        onError={() => setQrImageFailed(true)}
                      />
                    ) : (
                      <QRCodeSVG value={qrData} size={100} level="M" />
                    )}
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-1">
                    Scan for details
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">
                  Attendance Today
                </p>

                <div className="space-y-1.5">
                  {studentModules.length > 0 ? (
                    studentModules.map((m: any) => {
                      const att = getAttendanceStatus(m.id);

                      return (
                        <div
                          key={m.id || m.name}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-700">
                            {m.name}
                          </span>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() =>
                                onAttendanceUpdate(m.id, today, 'present')
                              }
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                                att === 'present'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              Present
                            </button>

                            <button
                              onClick={() =>
                                onAttendanceUpdate(m.id, today, 'absent')
                              }
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                                att === 'absent'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-400">No modules selected</p>
                  )}
                </div>
              </div>

              <div className="px-4 py-2 text-center bg-indigo-50">
                <p className="text-xs text-indigo-400">
                  Techna · School Management System
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  Payments
                </h3>

                <button
                  onClick={() => setShowPayModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                >
                  <Plus className="w-3 h-3" />
                  Add Payment
                </button>
              </div>

              <div className="space-y-2">
                {studentModules.length > 0 ? (
                  studentModules.map((m: any) => {
                    const paid = getModulePayment(m.id);

                    return (
                      <div
                        key={m.id || m.name}
                        className={`flex items-center justify-between p-3 rounded-xl ${
                          paid ? 'bg-emerald-50' : 'bg-gray-50'
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {m.name}
                        </span>

                        {paid ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-600 font-medium">
                              LKR {paid.amount?.toLocaleString()}
                            </span>
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
                  })
                ) : (
                  <p className="text-sm text-gray-400 text-center py-2">
                    No modules selected
                  </p>
                )}

                {(s.payments || []).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">
                    No payment records
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">
                Attendance History
              </h3>

              {(s.attendance || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No attendance records
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...(s.attendance || [])].map((a: any) => (
                    <div
                      key={a.id || `${a.moduleId}-${a.date}`}
                      className="flex items-center justify-between text-sm p-2 rounded-lg bg-gray-50"
                    >
                      <span className="font-medium text-gray-700">
                        {a.moduleName}
                      </span>
                      <span className="text-gray-400 text-xs">{a.date}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.status === 'present'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {a.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">
                Personal Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {personalDetails.map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-medium text-gray-700 break-words">
                      {getValue(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {showPayModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowPayModal(false)}
            />

            <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="font-bold text-gray-800 mb-4">Add Payment</h3>

              <form onSubmit={handlePaySubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module
                  </label>

                  <select
                    required
                    value={payForm.moduleId}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, moduleId: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="">Select module...</option>
                    {studentModules.map((m: any) => (
                      <option key={m.id || m.name} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>

                  <input
                    type="number"
                    required
                    value={payForm.amount}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method
                  </label>

                  <select
                    value={payForm.method}
                    onChange={(e) =>
                      setPayForm((f) => ({
                        ...f,
                        method: e.target.value as 'cash' | 'bank' | 'online',
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paid Date
                  </label>

                  <input
                    type="date"
                    required
                    value={payForm.paidDate}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, paidDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
