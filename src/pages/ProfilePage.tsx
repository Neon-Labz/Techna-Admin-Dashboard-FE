'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Download, Filter, CreditCard,
  CheckCircle, Clock, AlertCircle, Loader2, RefreshCw, Plus, X,
  ChevronDown, ChevronUp, Users,
} from 'lucide-react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { paymentApi, PaymentRecord, CreatePaymentPayload } from '@/api/payment.api';
import api from '@/lib/axios';

const BATCHES = [
  '',
  'May 2024 Batch',
  'September 2024 Batch',
  'January 2025 Batch',
  'May 2025 Batch',
];

const MONTHS = [
  { num: '01', label: 'Jan' }, { num: '02', label: 'Feb' },
  { num: '03', label: 'Mar' }, { num: '04', label: 'Apr' },
  { num: '05', label: 'May' }, { num: '06', label: 'Jun' },
  { num: '07', label: 'Jul' }, { num: '08', label: 'Aug' },
  { num: '09', label: 'Sep' }, { num: '10', label: 'Oct' },
  { num: '11', label: 'Nov' }, { num: '12', label: 'Dec' },
];

interface StudentOption  { studentId: string; name: string; batch: string; }
interface ModuleOption   { id: string; name: string; }
interface StudentTracking {
  studentId: string;
  year: number;
  paidMonths: string[];
  pendingMonths: string[];
  payments: PaymentRecord[];
}

// ── helpers ───────────────────────────────────────────────────────────────────
const statusIcon = (s: string) =>
  s === 'paid'    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> :
  s === 'pending' ? <Clock       className="w-3.5 h-3.5 text-amber-500"   /> :
                    <AlertCircle className="w-3.5 h-3.5 text-red-500"     />;

const statusColor = (s: string) =>
  s === 'paid'    ? 'bg-emerald-100 text-emerald-700' :
  s === 'pending' ? 'bg-amber-100  text-amber-700'    :
                    'bg-red-100    text-red-700';

// ── Add Payment Modal ─────────────────────────────────────────────────────────
function AddPaymentModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (p: PaymentRecord) => void;
}) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [modules,  setModules]  = useState<ModuleOption[]>([]);
  const [saving,   setSaving]   = useState(false);

  const [form, setForm] = useState({
    studentId: '', moduleId: '', amount: '',
    paidDate:  new Date().toISOString().split('T')[0],
    method:    'cash'   as 'cash' | 'bank' | 'online',
    status:    'paid'   as 'paid' | 'pending' | 'overdue',
    receiptNo: '', batch: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const [sRes, mRes] = await Promise.all([
          api.get('/students'),
          api.get('/modules'),
        ]);
        const sData = sRes.data?.data ?? sRes.data;
        setStudents(
          Array.isArray(sData)
            ? sData
                .filter((s: any) => s.status === 'approved')
                .map((s: any) => ({
                  studentId: s.studentId,
                  name: s.name ?? s.fullNameEnglish ?? s.studentId,
                  batch: s.batch ?? '',
                }))
            : []
        );
        const mData = mRes.data?.data ?? mRes.data;
        setModules(
          Array.isArray(mData)
            ? mData.map((m: any) => ({ id: m._id ?? m.id, name: m.name }))
            : []
        );
      } catch (err) {
        console.error('Failed to load students/modules:', err);
      }
    })();
  }, []);

  const handleStudentChange = (studentId: string) => {
    const s = students.find(s => s.studentId === studentId);
    setForm(f => ({ ...f, studentId, batch: s?.batch ?? f.batch }));
  };

  const handleSubmit = async () => {
    if (!form.studentId || !form.moduleId || !form.amount || !form.paidDate) {
      toast.error('Please fill all required fields');
      return;
    }
    const student   = students.find(s => s.studentId === form.studentId);
    const moduleRec = modules.find(m => m.id === form.moduleId);
    const payload: CreatePaymentPayload = {
      studentId:   form.studentId,
      studentName: student?.name,
      moduleId:    form.moduleId,
      moduleName:  moduleRec?.name,
      amount:      Number(form.amount),
      paidDate:    form.paidDate,
      method:      form.method,
      status:      form.status,
      receiptNo:   form.receiptNo || undefined,
      batch:       form.batch || student?.batch || 'N/A',
    };
    setSaving(true);
    try {
      const created = await paymentApi.create(payload);
      toast.success('Payment recorded successfully!');
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to save payment';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  const Label = ({ text, required }: { text: string; required?: boolean }) => (
    <span className="text-sm font-medium text-gray-700">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Record New Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1">
            <Label text="Student" required />
            <select
              value={form.studentId}
              onChange={e => handleStudentChange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select student…</option>
              {students.map(s => (
                <option key={s.studentId} value={s.studentId}>
                  {s.name} ({s.studentId})
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <Label text="Module" required />
            <select
              value={form.moduleId}
              onChange={e => setForm(f => ({ ...f, moduleId: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select module…</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <Label text="Amount (LKR)" required />
            <input
              type="number" min={0} value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 10000"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label text="Payment Date" required />
            <input
              type="date" value={form.paidDate}
              onChange={e => setForm(f => ({ ...f, paidDate: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label text="Method" required />
            <select
              value={form.method}
              onChange={e => setForm(f => ({ ...f, method: e.target.value as any }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <Label text="Status" required />
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <Label text="Receipt No" />
            <input
              type="text" value={form.receiptNo}
              onChange={e => setForm(f => ({ ...f, receiptNo: e.target.value }))}
              placeholder="Auto-generated if empty"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label text="Batch" />
            <input
              type="text" value={form.batch}
              onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}
              placeholder="e.g. 2026"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Student Row — click to expand 12-month history inline ─────────────────────
function StudentPaymentRow({
  studentId,
  studentName,
  batch,
  payments,
  year,
  token,
  onDownloadSlip,
}: {
  studentId: string;
  studentName: string;
  batch: string;
  payments: PaymentRecord[];
  year: number;
  token: string | null;
  onDownloadSlip: (p: PaymentRecord) => void;
}) {
  const [expanded,     setExpanded]     = useState(false);
  const [tracking,     setTracking]     = useState<StudentTracking | null>(null);
  const [loadingTrack, setLoadingTrack] = useState(false);

  const fetchTracking = useCallback(async () => {
    // toggle collapse if already loaded
    if (tracking) { setExpanded(e => !e); return; }
    setLoadingTrack(true);
    try {
      const res  = await fetch(
        `http://localhost:4000/api/payments/student/${studentId}/tracking?year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      setTracking(json.data ?? json);
      setExpanded(true);
    } catch {
      toast.error('Failed to load tracking for ' + studentId);
    } finally {
      setLoadingTrack(false);
    }
  }, [studentId, year, token, tracking]);

  const paidSet    = useMemo(() => new Set(tracking?.paidMonths    ?? []), [tracking]);
  const pendingSet = useMemo(() => new Set(tracking?.pendingMonths ?? []), [tracking]);

  return (
    <>
      {/* ── Summary row — click anywhere to expand ── */}
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer select-none border-t border-gray-100"
        onClick={fetchTracking}
      >
        {/* Student cell */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {loadingTrack
              ? <Loader2     className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
              : expanded
              ? <ChevronUp   className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gray-400   flex-shrink-0" />}
            <div>
              <p className="text-sm font-semibold text-gray-800">{studentName}</p>
              <p className="text-xs text-gray-400 font-mono">{studentId}</p>
            </div>
          </div>
        </td>

        {/* Batch */}
        <td className="px-4 py-3 text-xs text-gray-500">{batch || '—'}</td>

        {/* 12 month pills */}
        {MONTHS.map(({ num, label }) => {
          const key       = `${year}-${num}`;
          const isPaid    = paidSet.has(key);
          const isPending = pendingSet.has(key);
          return (
            <td key={num} className="px-1 py-3 text-center">
              {!tracking
                ? <span className="w-7 h-7 rounded-full bg-gray-100 inline-flex items-center justify-center text-[10px] text-gray-300">
                    {label}
                  </span>
                : isPaid
                ? <span className="w-7 h-7 rounded-full bg-emerald-100 inline-flex items-center justify-center" title={`${label} – Paid`}>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                : isPending
                ? <span className="w-7 h-7 rounded-full bg-amber-100 inline-flex items-center justify-center" title={`${label} – Pending`}>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </span>
                : <span className="w-7 h-7 rounded-full bg-gray-100 inline-flex items-center justify-center text-[10px] text-gray-300">—</span>
              }
            </td>
          );
        })}

        {/* Paid / Pending counts */}
        <td className="px-4 py-3 text-center">
          {tracking
            ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                <CheckCircle className="w-3 h-3" />{paidSet.size}
              </span>
            : <span className="text-gray-300 text-xs">—</span>}
        </td>
        <td className="px-4 py-3 text-center">
          {tracking
            ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                <Clock className="w-3 h-3" />{pendingSet.size}
              </span>
            : <span className="text-gray-300 text-xs">—</span>}
        </td>
      </tr>

      {/* ── Expanded inline detail ── */}
      {expanded && (
        <tr>
          <td colSpan={17} className="p-0">
            <div className="bg-indigo-50/50 border-t border-b border-indigo-100 px-6 py-4">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">
                Payment Records — {studentName} — {year}
              </p>

              {payments.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-indigo-100">
                  <table className="w-full text-sm bg-white">
                    <thead>
                      <tr className="bg-indigo-50 border-b border-indigo-100">
                        {['Receipt No', 'Module', 'Amount', 'Method', 'Date', 'Status', 'Action'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs font-mono text-gray-400">{p.receiptNo}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{p.moduleName}</td>
                          <td className="px-4 py-2 text-sm font-semibold text-gray-800">
                            LKR {p.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500 capitalize">{p.method}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{p.paidDate}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>
                              {statusIcon(p.status)} {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={e => { e.stopPropagation(); onDownloadSlip(p); }}
                              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              <Download className="w-3 h-3" /> Slip
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No payment records for this student.
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [payments,      setPayments]      = useState<PaymentRecord[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [trackingYear,  setTrackingYear]  = useState(new Date().getFullYear());

  const [search,        setSearch]        = useState('');
  const [filterBatch,   setFilterBatch]   = useState('');
  const [filterModule,  setFilterModule]  = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');

  const token = useMemo(() => {
    try {
      const auth = localStorage.getItem('techna-auth');
      return JSON.parse(auth ?? '')?.state?.token ?? null;
    } catch { return null; }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentApi.getAll();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      setError('Failed to load payment data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const allModules = Array.from(
    new Map(payments.map(p => [p.moduleId, { id: p.moduleId, name: p.moduleName }])).values()
  );

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    return (
      (!search       || p.studentName.toLowerCase().includes(q) || p.receiptNo.toLowerCase().includes(q)) &&
      (!filterBatch  || p.batch    === filterBatch)  &&
      (!filterModule || p.moduleId === filterModule) &&
      (!filterStatus || p.status   === filterStatus)
    );
  });

  // Group by student for expandable rows
  const studentGroups = useMemo(() => {
    const map = new Map<string, {
      studentId: string; studentName: string;
      batch: string;     payments: PaymentRecord[];
    }>();
    filtered.forEach(p => {
      if (!map.has(p.studentId))
        map.set(p.studentId, { studentId: p.studentId, studentName: p.studentName, batch: p.batch, payments: [] });
      map.get(p.studentId)!.payments.push(p);
    });
    return Array.from(map.values());
  }, [filtered]);

  const totalPaid    = filtered.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = filtered.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);

  const generatePaymentSlip = (payment: PaymentRecord) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' });
    const w   = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(79, 70, 229); pdf.rect(0, 0, w, 20, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
    pdf.text('Techna', w / 2, 8, { align: 'center' });
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.text('Payment Receipt', w / 2, 14, { align: 'center' });
    pdf.setTextColor(0, 0, 0); pdf.setFontSize(9);
    let y = 28;
    const lines: [string, string][] = [
      ['Receipt No:',     payment.receiptNo],
      ['Student Name:',   payment.studentName],
      ['Student ID:',     payment.studentId],
      ['Module:',         payment.moduleName],
      ['Batch:',          payment.batch],
      ['Amount:',         `LKR ${payment.amount.toLocaleString()}`],
      ['Payment Method:', payment.method.toUpperCase()],
      ['Payment Date:',   payment.paidDate],
      ['Status:',         payment.status.toUpperCase()],
    ];
    lines.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');   pdf.text(label, 10, y);
      pdf.setFont('helvetica', 'normal'); pdf.text(value, 55, y);
      y += 8;
    });
    pdf.setDrawColor(200, 200, 200); pdf.line(10, y + 2, w - 10, y + 2);
    pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
    pdf.text('Generated by Techna · Thank you for your payment!', w / 2, y + 8, { align: 'center' });
    pdf.save(`receipt-${payment.receiptNo}.pdf`);
    toast.success('Receipt downloaded!');
  };

  const generateAllPDF = () => {
    if (filtered.length === 0) { toast.error('No records to export'); return; }
    const pdf   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(79, 70, 229); pdf.rect(0, 0, pageW, 18, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
    pdf.text('Techna — Payment Report', pageW / 2, 11, { align: 'center' });
    const headers   = ['Receipt No', 'Student', 'Module', 'Batch', 'Amount', 'Method', 'Date', 'Status'];
    const rows      = filtered.map(p => [p.receiptNo, p.studentName, p.moduleName, p.batch, `LKR ${p.amount.toLocaleString()}`, p.method, p.paidDate, p.status]);
    const colWidths = [30, 45, 30, 40, 25, 20, 25, 20];
    let y = 30; let x = 10;
    pdf.setFillColor(240, 240, 255); pdf.rect(8, y - 5, pageW - 16, 8, 'F');
    pdf.setTextColor(79, 70, 229); pdf.setFontSize(8);
    headers.forEach((h, i) => { pdf.setFont('helvetica', 'bold'); pdf.text(h, x, y); x += colWidths[i]; });
    y += 6; pdf.setTextColor(50, 50, 50);
    rows.forEach(row => {
      if (y > 190) { pdf.addPage(); y = 20; }
      x = 10;
      row.forEach((cell, i) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.text(cell, x, y); x += colWidths[i]; });
      y += 7; pdf.setDrawColor(230, 230, 230); pdf.line(8, y - 2, pageW - 8, y - 2);
    });
    pdf.save('payment-report.pdf');
    toast.success('Report exported!');
  };

  return (
    <div className="p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <p className="text-gray-500 text-sm">{payments.length} total records</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 text-indigo-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          <button
            onClick={fetchPayments} disabled={loading}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Payment
          </button>
          <button
            onClick={generateAllPDF}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Collected</p>
              <p className="text-xl font-bold text-gray-800">LKR {totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending / Overdue</p>
              <p className="text-xl font-bold text-gray-800">LKR {totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Filtered Records</p>
              <p className="text-xl font-bold text-gray-800">{filtered.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student name or receipt no…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {BATCHES.map(b => <option key={b} value={b}>{b || 'All Batches'}</option>)}
          </select>
          <select
            value={filterModule} onChange={e => setFilterModule(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Modules</option>
            {allModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
          {/* Year selector for monthly tracking pills */}
          <select
            value={trackingYear} onChange={e => setTrackingYear(Number(e.target.value))}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Main Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Table subheader */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-600">
            Click a student row to view 12-month payment history
          </span>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 inline-flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
              </span> Paid
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 inline-flex items-center justify-center">
                <Clock className="w-3 h-3 text-amber-500" />
              </span> Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gray-100 inline-flex items-center justify-center text-[9px] text-gray-300">—</span>
              No data
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-white z-10 min-w-[180px]">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">
                  Batch
                </th>
                {MONTHS.map(({ label }) => (
                  <th key={label} className="px-1 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">
                    {label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-emerald-600 uppercase tracking-wide w-16">
                  Paid
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-amber-500 uppercase tracking-wide w-16">
                  Pending
                </th>
              </tr>
            </thead>
            <tbody>
              {studentGroups.map(s => (
                <StudentPaymentRow
                  key={s.studentId}
                  studentId={s.studentId}
                  studentName={s.studentName}
                  batch={s.batch}
                  payments={s.payments}
                  year={trackingYear}
                  token={token}
                  onDownloadSlip={generatePaymentSlip}
                />
              ))}
            </tbody>
          </table>

          {!loading && studentGroups.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No payment records found</p>
              {payments.length > 0 && (
                <p className="text-xs mt-1">Try adjusting your filters</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Payment Modal ── */}
      {showAddModal && (
        <AddPaymentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={newPayment => setPayments(prev => [newPayment, ...prev])}
        />
      )}
    </div>
  );
}