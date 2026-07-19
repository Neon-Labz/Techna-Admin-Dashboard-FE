'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, PaymentRecord } from '../../types';
import { useDataStore } from '../../store/dataStore';
import { isPendingStudentId, formatStudentId } from '../../utils/studentId';
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

const formatTime = (value: any) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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


const imageToDataUrl = async (src: string): Promise<string | null> => {
  if (!src) return null;
  try {
    const response = await fetch(src, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Failed to load image: ${response.status}`);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Image conversion failed'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Unable to load image:', src, error);
    return null;
  }
};

const getImageFormat = (dataUrl: string) => {
  if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
};


const findStudentPhotoUrl = (student: any): string => {
  return student?.profilePhoto || student?.avatar || '';
};

const loadImageThroughCanvas = async (src: string): Promise<string | null> => {
  if (!src) return null;

  return await new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (error) {
        console.warn('Canvas image conversion failed:', error);
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = src;
  });
};

const loadStudentPhotoForPdf = async (
  photoUrl: string,
): Promise<string | null> => {
  if (!photoUrl) return null;

  const candidates = [
    photoUrl,
    `/_next/image?url=${encodeURIComponent(photoUrl)}&w=640&q=90`,
  ];

  for (const candidate of candidates) {
    const fetched = await imageToDataUrl(candidate);
    if (fetched) return fetched;

    const canvasImage = await loadImageThroughCanvas(candidate);
    if (canvasImage) return canvasImage;
  }

  return null;
};


const cropLogoContent = async (dataUrl: string): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      try {
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = image.naturalWidth || image.width;
        sourceCanvas.height = image.naturalHeight || image.height;

        const sourceContext = sourceCanvas.getContext('2d');
        if (!sourceContext) {
          resolve(dataUrl);
          return;
        }

        sourceContext.drawImage(image, 0, 0);

        const pixels = sourceContext.getImageData(
          0,
          0,
          sourceCanvas.width,
          sourceCanvas.height,
        );

        let left = sourceCanvas.width;
        let top = sourceCanvas.height;
        let right = 0;
        let bottom = 0;
        let found = false;

        for (let y = 0; y < sourceCanvas.height; y += 1) {
          for (let x = 0; x < sourceCanvas.width; x += 1) {
            const index = (y * sourceCanvas.width + x) * 4;
            const red = pixels.data[index];
            const green = pixels.data[index + 1];
            const blue = pixels.data[index + 2];
            const alpha = pixels.data[index + 3];

            const isVisibleContent =
              alpha > 20 && (red < 235 || green < 235 || blue < 235);

            if (isVisibleContent) {
              found = true;
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x);
              bottom = Math.max(bottom, y);
            }
          }
        }

        if (!found) {
          resolve(dataUrl);
          return;
        }

        const padding = Math.max(
          4,
          Math.round(Math.min(sourceCanvas.width, sourceCanvas.height) * 0.02),
        );

        left = Math.max(0, left - padding);
        top = Math.max(0, top - padding);
        right = Math.min(sourceCanvas.width - 1, right + padding);
        bottom = Math.min(sourceCanvas.height - 1, bottom + padding);

        const width = right - left + 1;
        const height = bottom - top + 1;

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = width;
        outputCanvas.height = height;

        const outputContext = outputCanvas.getContext('2d');
        if (!outputContext) {
          resolve(dataUrl);
          return;
        }

        outputContext.drawImage(
          sourceCanvas,
          left,
          top,
          width,
          height,
          0,
          0,
          width,
          height,
        );

        resolve(outputCanvas.toDataURL('image/png'));
      } catch (error) {
        console.warn('Logo crop failed:', error);
        resolve(dataUrl);
      }
    };

    image.onerror = () => reject(new Error('Logo image could not be processed'));
    image.src = dataUrl;
  });
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
  const [localAttendance, setLocalAttendance] = useState<any[]>(s.attendance || []);
  const [localPayments, setLocalPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paySubmitting, setPaySubmitting] = useState(false);
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

  // Normalize a module/subject name for comparison: lowercase, strip special chars, collapse whitespace
  const normalizeForMatch = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  const studentModules = studentModuleValues.map((item: string) => {
    const normItem = normalizeForMatch(item);
    const found = modules.find(
      (m: any) =>
        m.id === item ||
        m._id === item ||
        m.name === item ||
        normalizeForMatch(m.name || '') === normItem,
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
    if (!s.studentId && !s.id && !s._id) return;
    attendanceApi.getByStudent(s.studentId).then(setLocalAttendance).catch(() => {});
    setPaymentsLoading(true);

   
    const mongoId = s.id || s._id;
    const readableId = s.studentId;

    const fetchByReadable = readableId
      ? paymentApi.getByStudent(readableId).catch(() => [] as any[])
      : Promise.resolve([] as any[]);
    const fetchByMongo = mongoId && mongoId !== readableId
      ? paymentApi.getByStudent(mongoId).catch(() => [] as any[])
      : Promise.resolve([] as any[]);

    Promise.all([fetchByReadable, fetchByMongo])
      .then(([byReadable, byMongo]) => {
        // Merge and deduplicate by payment id
        const merged = [...byReadable, ...byMongo];
        const seen = new Set<string>();
        const unique = merged.filter((p: any) => {
          const key = p.id || p._id || `${p.moduleId}-${p.paidDate}-${p.amount}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setLocalPayments(unique);
      })
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }, [s.studentId, s.id, s._id]);

  const getAttendanceRecord = (moduleId: string) => {
    return localAttendance.find(
      (a: any) => a.moduleId === moduleId && (a.date === today || String(a.date).startsWith(today)),
    );
  };

  const getModulePayment = (moduleId: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2025-07"
    // Match by moduleId or moduleName since the payment might store either
    const mod = studentModules.find((m: any) => m.id === moduleId);
    const moduleName = normalizeForMatch(mod?.name || moduleId);
    const moduleIdLower = moduleId.toLowerCase().trim();

    // Also get the real module ID from the store if available (the MongoDB ObjectId)
    const realModuleId = (mod?.id || (mod as any)?._id || '').toLowerCase().trim();

    return localPayments.find(
      (p: any) => {
        const pModuleId = (p.moduleId || '').toLowerCase().trim();
        const pModuleName = normalizeForMatch(p.moduleName || '');

        // Exact matches on ID or normalized name
        const exactMatch =
          pModuleId === moduleIdLower ||
          pModuleName === moduleName ||
          pModuleId === moduleName;

        // Also match if payment's moduleId matches the store's real module ID
        const realIdMatch = realModuleId && realModuleId !== moduleName && (
          pModuleId === realModuleId
        );

        return (exactMatch || realIdMatch) && p.status === 'paid' && p.paidDate?.slice(0, 7) === currentMonth;
      },
    );
  };

  const handleDownloadPDF = async () => {
    const toastId = toast.loading('Generating student ID card...');

    try {
      const cardWidth = 86;
      const cardHeight = 54;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [cardWidth, cardHeight],
        compress: true,
      });

      const rawLogoDataUrl = await imageToDataUrl('/new.png');
      const logoDataUrl = rawLogoDataUrl
        ? await cropLogoContent(rawLogoDataUrl)
        : null;
      const studentPhotoUrl = findStudentPhotoUrl(s);
      const studentPhotoDataUrl = await loadStudentPhotoForPdf(studentPhotoUrl);

      if (!studentPhotoUrl) {
        console.warn('No student profile photo URL found in student data:', s);
      } else if (!studentPhotoDataUrl) {
        console.warn('Student photo found but could not be loaded for PDF:', studentPhotoUrl);
      }

      const qrImage = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 500,
        color: {
          dark: '#082B67',
          light: '#FFFFFF',
        },
      });

      const admissionNumber = String(
        s.admissionNumber ||
          s.studentId ||
          s.applicationReference ||
          'N/A',
      );

      const issuedDateValue =
        s.approvedAt || s.enrolledAt || s.createdAt || new Date();

      const issuedDateObject = new Date(issuedDateValue);
      const issuedDate = Number.isNaN(issuedDateObject.getTime())
        ? String(issuedDateValue)
        : issuedDateObject.toLocaleDateString('en-GB').replaceAll('/', '.');

      const nicNumber = String(s.nicNo || s.nic || 'N/A');

      const subjects =
        studentModules.length > 0
          ? studentModules.map((module: any) => module.name).join(' • ')
          : 'N/A';

      const blue = [17, 151, 239] as const;
      const darkBlue = [6, 48, 111] as const;

      // White card base
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(0.5, 0.5, cardWidth - 1, cardHeight - 1, 2.5, 2.5, 'F');

      // Header
      pdf.setFillColor(...blue);
      pdf.rect(0.5, 0.5, cardWidth - 1, 15, 'F');

      // Logo only - white rounded background removed
      if (logoDataUrl) {
        const logoProps = pdf.getImageProperties(logoDataUrl);
        const logoRatio = logoProps.width / logoProps.height;

        const maxLogoWidth = 31;
        const maxLogoHeight = 9.5;

        let logoWidth = maxLogoWidth;
        let logoHeight = logoWidth / logoRatio;

        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = logoHeight * logoRatio;
        }

        const logoX = 4;
        const logoY = 1.7;

        pdf.addImage(
          logoDataUrl,
          'PNG',
          logoX,
          logoY,
          logoWidth,
          logoHeight,
          undefined,
          'FAST',
        );
      } else {
        pdf.setTextColor(...darkBlue);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('TECHNA', 16.75, 7.6, { align: 'center' });
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.6);
      pdf.text('A/L TECHNOLOGY STREAM', 4, 13.4);

      // QR box
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(...darkBlue);
      pdf.setLineWidth(0.25);
      pdf.roundedRect(72, 2, 10.5, 10.5, 0.8, 0.8, 'FD');
      pdf.addImage(qrImage, 'PNG', 72.8, 2.8, 8.9, 8.9, undefined, 'FAST');

      // Student photo box
      const photoX = 5;
      const photoY = 18.5;
      const photoWidth = 20;
      const photoHeight = 24;

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(...darkBlue);
      pdf.setLineWidth(0.35);
      pdf.roundedRect(
        photoX,
        photoY,
        photoWidth,
        photoHeight,
        1.3,
        1.3,
        'FD',
      );

      if (studentPhotoDataUrl) {
        pdf.addImage(
          studentPhotoDataUrl,
          getImageFormat(studentPhotoDataUrl),
          photoX + 0.7,
          photoY + 0.7,
          photoWidth - 1.4,
          photoHeight - 1.4,
          undefined,
          'FAST',
        );
      }

      // Name
      const detailsX = 30.5;
      const name = studentName.toUpperCase();

      pdf.setTextColor(...darkBlue);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.2);

      let nameSize = 8.2;
      while (pdf.getTextWidth(name) > 49 && nameSize > 5.8) {
        nameSize -= 0.25;
        pdf.setFontSize(nameSize);
      }

      pdf.text(name, detailsX, 20.8);

      pdf.setDrawColor(...blue);
      pdf.setLineWidth(0.35);
      pdf.line(detailsX, 22.4, 80.8, 22.4);

      const labelX = detailsX;
      const colonX = 48.5;
      const valueX = 52.5;

      const drawRow = (
        label: string,
        value: string,
        y: number,
        maxWidth = 28,
      ) => {
        pdf.setTextColor(...darkBlue);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(5.4);
        pdf.text(label, labelX, y);
        pdf.text(':', colonX, y);

        let valueSize = 5.4;
        pdf.setFontSize(valueSize);

        while (pdf.getTextWidth(value) > maxWidth && valueSize > 4.2) {
          valueSize -= 0.2;
          pdf.setFontSize(valueSize);
        }

        pdf.text(value, valueX, y);
      };

      drawRow('Admission No.', admissionNumber, 26.8);
      drawRow('Batch', String(s.batch || 'N/A'), 31);
      drawRow('Issued', issuedDate, 35.2);
      drawRow('NIC', nicNumber, 39.4);

      pdf.setTextColor(...darkBlue);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.4);
      pdf.text('Subjects', labelX, 43.6);
      pdf.text(':', colonX, 43.6);

      pdf.setFontSize(4.8);
      const subjectLines = pdf.splitTextToSize(subjects, 28.5);
      pdf.text(subjectLines.slice(0, 2), valueX, 43.6);

      // Footer
      pdf.setFillColor(...blue);
      pdf.rect(0.5, 47.5, cardWidth - 1, 6, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.3);
      pdf.text('www.techna.lk', 4.5, 51.4);

      pdf.setFontSize(6);
      pdf.text('TECHNA STUDENT ID', 80.5, 51.4, {
        align: 'right',
      });

      const safeStudentId = admissionNumber
        .replace(/[^\w-]/g, '-')
        .replace(/-+/g, '-');

      pdf.save(`${safeStudentId}-techna-student-id.pdf`);

      toast.success('Student ID card downloaded!', {
        id: toastId,
      });
    } catch (error) {
      console.error('QR card generation failed:', error);
      toast.error('QR Card Download Failed', {
        id: toastId,
      });
    }
  };

  const handleAttendanceClick = async (
    moduleId: string,
    moduleName: string,
    date: string,
    status: 'present' | 'absent',
  ) => {
    onAttendanceUpdate(moduleId, date, status);
    const markedAt = new Date().toISOString();
    setLocalAttendance(prev => {
      const filtered = prev.filter(
        (a: any) => !(a.moduleId === moduleId && (a.date === date || String(a.date).startsWith(date))),
      );
      return [...filtered, { moduleId, date, status, markedAt }];
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
    if (paySubmitting) return;

    const mod: any = studentModules.find((m: any) => m.id === payForm.moduleId);
    if (!mod) return;

    setPaySubmitting(true);

    // Fetch fresh payment data from the API to catch payments made elsewhere (e.g. Payments page)
    let freshPayments = localPayments;
    try {
      const mongoId = s.id || s._id;
      const readableId = s.studentId;
      const [byReadable, byMongo] = await Promise.all([
        readableId ? paymentApi.getByStudent(readableId).catch(() => [] as any[]) : Promise.resolve([] as any[]),
        mongoId && mongoId !== readableId ? paymentApi.getByStudent(mongoId).catch(() => [] as any[]) : Promise.resolve([] as any[]),
      ]);
      const merged = [...byReadable, ...byMongo];
      const seen = new Set<string>();
      freshPayments = merged.filter((p: any) => {
        const key = p.id || p._id || `${p.moduleId}-${p.paidDate}-${p.amount}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setLocalPayments(freshPayments);
    } catch {
      // If fetch fails, fall back to existing localPayments for validation
    }

    // Duplicate payment validation: check student + module + month
    const paidMonth = payForm.paidDate.slice(0, 7); // e.g. "2025-07"
    const moduleName = normalizeForMatch(mod.name || '');
    const formModuleIdLower = (payForm.moduleId || '').toLowerCase().trim();
    const isDuplicate = freshPayments.some(
      (p: any) => {
        const pModuleId = (p.moduleId || '').toLowerCase().trim();
        const pModuleName = normalizeForMatch(p.moduleName || '');
        const moduleMatch =
          pModuleId === formModuleIdLower ||
          pModuleName === moduleName ||
          pModuleId === moduleName ||
          pModuleName === formModuleIdLower;
        return moduleMatch && p.status === 'paid' && p.paidDate?.slice(0, 7) === paidMonth;
      },
    );

    if (isDuplicate) {
      toast.error(
        `Payment already exists for ${mod.name} in ${paidMonth}. Only one payment is allowed per student, subject, and month.`,
      );
      setPaySubmitting(false);
      return;
    }

    const receiptNo = `REC-${Date.now()}`;

    // Save payment to the backend API first so it's visible on the Payments page
    try {
      const saved = await paymentApi.create({
        studentId: s.id || s._id,
        studentName: studentName,
        moduleId: payForm.moduleId,
        moduleName: mod.name,
        feeType: 'subject',
        amount: Number(payForm.amount),
        paidDate: payForm.paidDate,
        method: payForm.method,
        status: 'paid',
        receiptNo,
        batch: s.batch,
      });
      setLocalPayments(prev => [...prev, saved]);
      toast.success('Payment recorded successfully!');
    } catch (err) {
      console.error('Payment API failed:', err);
      toast.error('Failed to save payment. Please try again.');
      setPaySubmitting(false);
      return; // Don't close modal if API failed
    }

    setPaySubmitting(false);
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
                        {formatStudentId(s.studentId)}
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
                        {(s.status || 'N/A').toUpperCase()}
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
                    const rec = getAttendanceRecord(m.id);
                    const att = rec?.status || null;
                    const markedTime = formatTime(rec?.markedAt || rec?.createdAt);

                    return (
                      <div
                        key={m.id || m.name}
                        className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <span className="text-[13px] font-bold text-slate-800">
                          {m.name}
                        </span>

                        <div className="flex items-center gap-2">
                          {markedTime ? (
                            <span className="text-xs text-slate-400">
                              Marked at: {markedTime}
                            </span>
                          ) : null}

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

          <span className="text-slate-400">
            {formatDate(a.date)}
            {formatTime(a.markedAt || a.createdAt) ? (
              <span className="ml-1 text-xs text-slate-400">
                ({formatTime(a.markedAt || a.createdAt)})
              </span>
            ) : null}
          </span>

          <span
            className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold uppercase ${
              a.status === 'present'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {a.status === 'present' ? 'PRESENT' : 'ABSENT'}
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
                  disabled={paymentsLoading}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Payment
                </button>
              </div>

              {paymentsLoading ? (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-[13px] text-slate-400">
                  Loading payments...
                </p>
              ) : (
              <>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {studentModules.length > 0 ? (
                  studentModules.map((m: any) => {
                    const paid = getModulePayment(m.id);

                    return (
                      <div
                        key={m.id || m.name}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 min-h-[40px] ${
                          paid
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-100 bg-white'
                        }`}
                      >
                        <span className="text-[13px] font-bold text-slate-800 truncate min-w-0">
                          {m.name}
                        </span>

                        {paid ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">
                              LKR {paid.amount?.toLocaleString()}
                            </span>
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-shrink-0">
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

                {localPayments.length === 0 ? (
                  <p className="text-[13px] text-slate-400">
                    No payment records
                  </p>
                ) : (
                  <div className="space-y-2">
                    {localPayments.map((p: any) => (
                      <div
                        key={
                          p.id || p._id || p.receiptNo || `${p.moduleId}-${p.paidDate}`
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
              </>
              )}
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
                    Payment Date
                  </label>

                  <input
                    type="date"
                    required
                    value={payForm.paidDate}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, paidDate: e.target.value, moduleId: '' }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Select the month you are paying for
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module
                  </label>

                  <select
                    required
                    value={payForm.moduleId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedMod: any = studentModules.find((m: any) => m.id === selectedId);
                      const fee = selectedMod?.fee || 1200; // default 1200 if no fee set
                      setPayForm((f) => ({ ...f, moduleId: selectedId, amount: selectedId ? String(fee) : '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="">Select module...</option>
                    {studentModules.map((m: any) => {
                      // Check if already paid for the SELECTED month (not just current month)
                      const selectedMonth = payForm.paidDate?.slice(0, 7) || new Date().toISOString().slice(0, 7);
                      const moduleNameNorm = normalizeForMatch(m.name || '');
                      const moduleIdLower = (m.id || '').toLowerCase().trim();
                      const alreadyPaidForMonth = localPayments.find((p: any) => {
                        const pModuleId = (p.moduleId || '').toLowerCase().trim();
                        const pModuleName = normalizeForMatch(p.moduleName || '');
                        const moduleMatch =
                          pModuleId === moduleIdLower ||
                          pModuleName === moduleNameNorm ||
                          pModuleId === moduleNameNorm ||
                          pModuleName === moduleIdLower;
                        return moduleMatch && p.status === 'paid' && p.paidDate?.slice(0, 7) === selectedMonth;
                      });
                      const fee = m.fee || 1200;
                      return (
                        <option key={m.id || m.name} value={m.id} disabled={!!alreadyPaidForMonth}>
                          {m.name} - LKR {fee.toLocaleString()}{alreadyPaidForMonth ? ` (Paid for ${selectedMonth})` : ''}
                        </option>
                      );
                    })}
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
                    disabled={paySubmitting}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paySubmitting ? 'Saving...' : 'Save'}
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