'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, PaymentRecord } from '../../types';
import { useDataStore } from '../../store/dataStore';
import { attendanceApi } from '@/api/attendance.api';
import { paymentApi } from '@/api/payment.api';
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

const getStatusBadgeClass = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-700 border border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-700 border border-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
};

const DetailItem = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value: any;
  className?: string;
}) => (
  <div className={className}>
    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
      {label}
    </p>
    <p className="mt-1 text-sm font-bold leading-snug text-slate-800 break-words">
      {getValue(value)}
    </p>
  </div>
);

const ProfileSection = ({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5 ${className}`}
  >
    <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
      {title}
    </h3>
    <div className="mt-4">{children}</div>
  </section>
);

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
  const [localAttendance, setLocalAttendance] = useState<any[]>(s.attendance || []);
  const [localPayments, setLocalPayments] = useState<any[]>(s.payments || []);
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
  const olResults = Array.isArray(s.olResults) ? s.olResults : [];

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

  useEffect(() => {
    if (!s.studentId) return;
    attendanceApi.getByStudent(s.studentId).then(setLocalAttendance).catch(() => {});
    paymentApi.getByStudent(s.studentId || s.id).then(setLocalPayments).catch(() => {});
  }, [s.studentId, s.id]);

  const getAttendanceStatus = (moduleId: string) => {
    const rec = localAttendance.find(
      (a: any) => a.moduleId === moduleId && (a.date === today || String(a.date).startsWith(today)),
    );
    return rec?.status || null;
  };

  const getModulePayment = (moduleId: string) => {
    return localPayments.find(
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
      pdf.text('Techna - School Management System', pageWidth / 2, 20, {
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

  const handleAttendanceClick = async (
    moduleId: string,
    moduleName: string,
    date: string,
    status: 'present' | 'absent',
  ) => {
    onAttendanceUpdate(moduleId, date, status);
    setLocalAttendance(prev => {
      const filtered = prev.filter(
        (a: any) => !(a.moduleId === moduleId && (a.date === date || String(a.date).startsWith(date))),
      );
      return [...filtered, { moduleId, date, status }];
    });
    try {
      await attendanceApi.markAttendance({
        studentId: s.studentId,
        moduleId,
        moduleName,
        date,
        status,
      });
    } catch (err: any) {
      if (err?.response?.status !== 409) {
        toast.error('Failed to save attendance');
      }
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mod: any = studentModules.find((m: any) => m.id === payForm.moduleId);
    if (!mod) return;

    const receiptNo = `REC-${Date.now()}`;

    onPaymentAdd({
      studentId: s.id || s._id,
      studentName: studentName,
      moduleId: payForm.moduleId,
      moduleName: mod.name,
      amount: Number(payForm.amount),
      paidDate: payForm.paidDate,
      method: payForm.method,
      status: 'paid',
      receiptNo,
      batch: s.batch,
    });

    try {
      const saved = await paymentApi.create({
        studentId: s.studentId || s.id || s._id,
        studentName: studentName,
        moduleId: payForm.moduleId,
        moduleName: mod.name,
        amount: Number(payForm.amount),
        paidDate: payForm.paidDate,
        method: payForm.method,
        status: 'paid',
        receiptNo,
        batch: s.batch,
      });
      setLocalPayments(prev => [...prev, saved]);
    } catch (err) {
      console.error('Payment API failed:', err);
      toast.error('Payment saved locally but failed to sync to server');
    }

    setShowPayModal(false);
    setPayForm({
      moduleId: '',
      amount: '',
      method: 'cash',
      paidDate: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex h-[90vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close student profile"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="shrink-0 border-b border-slate-100 px-5 py-4 lg:px-8 lg:py-5">
          <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Student Profile
              </h2>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold uppercase tracking-[0.08em]">
                <p className="text-slate-400">
                  Enrolled:{' '}
                  <span className="text-slate-700">
                    {formatDate(s.enrolledAt)}
                  </span>
                </p>
                <p className="text-slate-400">
                  Approved:{' '}
                  <span className="text-emerald-600">
                    {s.approvedAt ? formatDate(s.approvedAt) : 'Not yet'}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadPDF}
              className="flex w-fit items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />
              Download QR Card
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto bg-white p-4 lg:grid-cols-[420px_minmax(0,1fr)] lg:overflow-hidden lg:p-5">
          <aside className="space-y-4 lg:h-full lg:overflow-hidden">
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                Student ID Card (PDF Preview)
              </h3>

              <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
                <div className="rounded-t-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-white/20 text-xl font-bold">
                      {(s.avatar || s.profilePhoto) ? (
                        <img
                          src={s.avatar || s.profilePhoto}
                          alt={studentName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{studentName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-lg font-bold leading-tight">
                        {studentName}
                      </h2>
                      <p className="mt-0.5 text-[12px] text-indigo-100">
                        {getValue(s.studentId)}
                      </p>
                      <p className="text-[12px] text-indigo-100">
                        {getValue(s.batch)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_125px]">
                  <div className="space-y-1.5 border-r border-dashed border-slate-200 pr-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Phone
                      </span>
                      <p className="text-[12px] font-bold leading-tight text-slate-800">
                        {getValue(s.phone || s.whatsappNo)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Email
                      </span>
                      <p className="text-[12px] font-bold leading-tight text-slate-800 break-words">
                        {getValue(s.email)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Status
                      </span>
                      <span
                        className={`mt-0.5 block w-fit rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${getStatusBadgeClass(
                          s.status,
                        )}`}
                      >
                        {s.status || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Modules
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {studentModules.length > 0 ? (
                          studentModules.map((m: any) => (
                            <span
                              key={m.id || m.name}
                            className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-600"
                            >
                              {m.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">
                            No modules selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-white leading-none">
                      {shouldShowQrImage ? (
                        <img
                          src={qrImageUrl}
                          alt="Student QR"
                          className="h-[112px] w-[112px] object-contain"
                          onError={() => setQrImageFailed(true)}
                        />
                      ) : (
                        <QRCodeSVG value={qrData} size={112} level="M" />
                      )}
                    </div>
                    <p className="mt-2 text-center text-[10px] uppercase text-slate-300">
                      Scan for details
                    </p>
                  </div>
                </div>

                <div className="flex h-8 items-center justify-center rounded-b-2xl bg-slate-50 px-4 text-center">
                  <p className="text-xs text-blue-400">
                    Techna - School Management System
                  </p>
                </div>
              </div>
            </div>

          </aside>

          <main className="min-w-0 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-4">
            <ProfileSection title="Attendance (Today)">
              <div className="space-y-2">
                {studentModules.length > 0 ? (
                  studentModules.map((m: any) => {
                    const att = getAttendanceStatus(m.id);

                    return (
                      <div
                        key={m.id || m.name}
                        className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <span className="text-[13px] font-bold text-slate-800">
                          {m.name}
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleAttendanceClick(m.id, m.name, today, 'present')
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                              att === 'present'
                                ? 'border-emerald-100 bg-emerald-100 text-emerald-600'
                                : 'border-slate-200 bg-white text-slate-400 hover:text-emerald-600'
                            }`}
                          >
                            Present
                          </button>

                          <button
                            onClick={() =>
                              handleAttendanceClick(m.id, m.name, today, 'absent')
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                              att === 'absent'
                                ? 'border-red-100 bg-red-100 text-red-600'
                                : 'border-slate-200 bg-white text-slate-400 hover:text-red-600'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-[13px] text-slate-400">
                    No modules selected
                  </p>
                )}
              </div>
            </ProfileSection>

            <ProfileSection title="Attendance History">
  {(s.attendance || []).length === 0 ? (
    <p className="text-[13px] text-slate-400">No attendance records</p>
  ) : (
    <div className="max-h-64 space-y-3 overflow-y-auto pr-2">
      {[...(s.attendance || [])].map((a: any) => (
        <div
          key={a.id || `${a.moduleId}-${a.date}`}
          className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[13px] md:grid-cols-[1fr_auto_auto] md:items-center md:gap-4"
        >
          <span className="font-bold text-slate-800">
            {getValue(a.moduleName)}
          </span>

          <span className="text-slate-400">{formatDate(a.date)}</span>

          <span
            className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold uppercase ${
              a.status === 'present'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {a.status === 'present' ? 'Present' : 'Absent'}
          </span>
        </div>
      ))}
    </div>
  )}
</ProfileSection>

            <ProfileSection title="Payments">
              <div className="-mt-1 mb-3 flex justify-end">
                <button
                  onClick={() => setShowPayModal(true)}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Payment
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {studentModules.length > 0 ? (
                  studentModules.map((m: any) => {
                    const paid = getModulePayment(m.id);

                    return (
                      <div
                        key={m.id || m.name}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                          paid
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-100 bg-white'
                        }`}
                      >
                        <span className="text-[13px] font-bold text-slate-800">
                          {m.name}
                        </span>

                        {paid ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-600">
                              LKR {paid.amount?.toLocaleString()}
                            </span>
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">
                              Unpaid
                            </span>
                            <XCircle className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-[13px] text-slate-400">
                    No modules selected
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <h4 className="mb-3 text-xs font-bold uppercase text-slate-400">
                  Payment History
                </h4>

                {(s.payments || []).length === 0 ? (
                  <p className="text-[13px] text-slate-400">
                    No payment records
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(s.payments || []).map((p: any) => (
                      <div
                        key={
                          p.id || p.receiptNo || `${p.moduleId}-${p.paidDate}`
                        }
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-4 text-[13px]"
                      >
                        <span className="font-bold text-slate-800">
                          {getValue(p.moduleName)}
                        </span>
                        <span className="text-slate-400">
                          {formatDate(p.paidDate)}
                        </span>
                        <span className="font-bold text-emerald-600">
                          LKR{' '}
                          {p.amount?.toLocaleString?.() || getValue(p.amount)}
                        </span>
                        <span className="col-span-3 -mt-2 text-right text-xs capitalize text-slate-400">
                          {getValue(p.method)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ProfileSection>

            <ProfileSection title="Personal Details">
              <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
                <DetailItem label="Full Name" value={s.fullNameEnglish || s.name} />
                <DetailItem label="Email" value={s.email} />
                <DetailItem label="Phone Number" value={s.phone || s.whatsappNo} />
                <DetailItem label="WhatsApp Number" value={s.whatsappNo} />
                <DetailItem
                  label="Date of Birth"
                  value={formatDate(s.dateOfBirth || s.dob)}
                />
                <DetailItem label="NIC Number" value={s.nicNo} />
                <DetailItem label="School" value={s.school} />
                <DetailItem label="Race" value={s.race} />
                <DetailItem
                  label="Permanent Address"
                  value={s.permanentAddress || s.address}
                  className="border-t border-slate-100 pt-4 md:col-span-2 xl:col-span-3"
                />
              </div>
            </ProfileSection>

            <ProfileSection title="Parent/Guardian Details">
              <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
                <DetailItem label="Father's Name" value={s.fatherName} />
                <DetailItem label="Mother's Name" value={s.motherName} />
                <DetailItem
                  label="Guardian Name"
                  value={s.guardianName || s.parentName}
                />
                <DetailItem label="Guardian Mobile" value={s.guardianMobile} />
              </div>
            </ProfileSection>

            <ProfileSection title="Address Details">
              <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-3">
                <DetailItem
                  label="Permanent Address"
                  value={s.permanentAddress || s.address}
                />
                <DetailItem
                  label="District"
                  value={s.administrativeDistrict || s.district}
                />
                <DetailItem label="Postal Code" value={s.postalCode} />
              </div>
            </ProfileSection>

            <ProfileSection title="O/L Results">
              <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-3">
                <DetailItem label="O/L Category" value={s.olCategory} />
                <DetailItem label="O/L Year" value={s.olYear} />
                <DetailItem label="Index Number" value={s.olIndexNumber} />
                <DetailItem
                  label="Name Used"
                  value={s.olNameUsed}
                  className="md:col-span-2"
                />
                <DetailItem label="Accept Status" value={s.olAccept} />
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
                {olResults.length === 0 ? (
                  <p className="bg-slate-50 p-4 text-[13px] text-slate-400">
                    No O/L results added
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Year</th>
                          <th className="px-4 py-3">Index No</th>
                          <th className="px-4 py-3">English</th>
                          <th className="px-4 py-3">Mathematics</th>
                          <th className="px-4 py-3">Science</th>
                          <th className="px-4 py-3">Sinhala</th>
                          <th className="px-4 py-3">Tamil</th>
                        </tr>
                      </thead>
                      <tbody>
                        {olResults.map((row: any, index: number) => (
                          <tr
                            key={`${row.year || 'year'}-${row.indexNumber || index}`}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3 font-bold text-slate-800">
                              {getValue(row.year)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {getValue(row.indexNumber)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {getValue(row.english)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {getValue(row.mathematics)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {getValue(row.science)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {getValue(row.sinhala)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {getValue(row.tamil)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </ProfileSection>
          </main>
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
