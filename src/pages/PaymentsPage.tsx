'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, Download, Filter, CreditCard,
  CheckCircle, Clock, AlertCircle, Loader2, RefreshCw, Plus, X,
  ChevronDown, ChevronUp, Users, Edit2,
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

interface StudentOption {
  _id:        string;     // MongoDB ObjectId — used to look up legacy payments
  studentId:  string;     // display ID e.g. "STU019"
  name:       string;
  batch:      string;
  moduleRefs: string[];
  status:     string;
}
interface ModuleOption { id: string; name: string; }
interface StudentTracking {
  studentId: string;
  year: number;
  paidMonths: string[];
  pendingMonths: string[];
  payments: PaymentRecord[];
}

function extractArrayResponse(value: unknown): any[] {
  if (Array.isArray(value)) return value;

  if (!value || typeof value !== 'object') return [];

  const data = (value as { data?: unknown }).data;
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    const nestedData = (data as { data?: unknown }).data;
    if (Array.isArray(nestedData)) return nestedData;

    const students = (data as { students?: unknown }).students;
    if (Array.isArray(students)) return students;

    const modules = (data as { modules?: unknown }).modules;
    if (Array.isArray(modules)) return modules;
  }

  const students = (value as { students?: unknown }).students;
  if (Array.isArray(students)) return students;

  const modules = (value as { modules?: unknown }).modules;
  if (Array.isArray(modules)) return modules;

  return [];
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

// Strips punctuation and collapses whitespace for fuzzy name matching.
// Handles mismatches like "Information & Communication Technology"
// vs "Information Communication Technology" from different data sources.
const normalizeModuleName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Payment Modal (Add + Edit) ─────────────────────────────────────────────────
function PaymentModal({
  onClose,
  onSuccess,
  initialData,
}: {
  onClose: () => void;
  onSuccess: (p: PaymentRecord) => void;
  initialData?: PaymentRecord | null;
}) {
  const isEdit = !!initialData;
  const [students,            setStudents]            = useState<StudentOption[]>([]);
  const [allModules,          setAllModules]          = useState<ModuleOption[]>([]);
  const [registeredModuleIds, setRegisteredModuleIds] = useState<string[]>([]);
  const [fetchingMods,        setFetchingMods]        = useState(false);
  const [saving,              setSaving]              = useState(false);
  // Prevents the edit-mode enrollment useEffect from firing more than once
  const enrollmentInitedRef = useRef(false);

  const [form, setForm] = useState({
    studentId: initialData?.studentId ?? '',
    moduleId:  initialData?.moduleId  ?? '',
    amount:    initialData?.amount != null ? String(initialData.amount) : '',
    paidDate:  initialData?.paidDate  ?? new Date().toISOString().split('T')[0],
    method:    (initialData?.method   ?? 'cash') as 'cash' | 'bank' | 'online',
    status:    (initialData?.status   ?? 'paid') as 'paid' | 'pending' | 'overdue',
    batch:     initialData?.batch     ?? '',
    notes:     initialData?.notes     ?? '',
  });

  // lib/axios interceptor already unwraps the envelope → result IS the array directly
  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [sRaw, mRaw]: [any, any] = await Promise.all([
          api.get('/students'),
          api.get('/modules'),
        ]);
        const sArr = extractArrayResponse(sRaw);
        const mArr = extractArrayResponse(mRaw);

        setStudents(
          sArr.map(s => ({
            _id:        (s._id ?? s.id ?? s.studentId) as string,
            studentId:  s.studentId as string,
            name:       (s.fullNameEnglish ?? s.name ?? s.studentId) as string,
            batch:      (s.batch ?? '') as string,
            moduleRefs: Array.isArray(s.modules) ? (s.modules as string[]) : [],
            status:     (s.status ?? 'pending') as string,
          }))
        );

        setAllModules(
          mArr.map(m => ({
            id:   (m._id ?? m.id) as string,
            name: m.name as string,
          }))
        );
      } catch (err) {
        console.error('Failed to load students/modules:', err);
        toast.error('Failed to load student/module list');
      }
    })();
  }, []);

  // Loads enrolled modules for a given student without touching the form.
  // Two sources, merged and deduplicated:
  //   1. student.modules (subject names) → fuzzy-matched against DB module names
  //   2. payment history → exact moduleId match (reliable for returning students)
  const loadEnrollmentForStudent = useCallback(async (s: StudentOption) => {
    // Source 1: name-based match using the student's registered subject list
    const nameBasedIds = s.moduleRefs.length > 0
      ? allModules
          .filter(m => s.moduleRefs.some(ref => {
            const normM = normalizeModuleName(m.name);
            const normR = normalizeModuleName(ref);
            return normM === normR || normM.includes(normR) || normR.includes(normM);
          }))
          .map(m => m.id)
      : [];

    if (nameBasedIds.length > 0) {
      setRegisteredModuleIds(nameBasedIds);
    }

    // Source 2: payment history (covers returning students and edge-case name mismatches)
    setFetchingMods(true);
    try {
      const results = await Promise.allSettled([
        paymentApi.getByStudent(s._id),
        s._id !== s.studentId
          ? paymentApi.getByStudent(s.studentId)
          : Promise.resolve<PaymentRecord[]>([]),
      ]);
      const merged: PaymentRecord[] = results.flatMap(r =>
        r.status === 'fulfilled' ? r.value : []
      );
      const paymentIds = [...new Set(merged.map(p => p.moduleId).filter(Boolean))];
      // Merge both sources; functional update picks up nameBasedIds already set above
      setRegisteredModuleIds(prev => [...new Set([...prev, ...paymentIds])]);
    } catch {
      // retain nameBasedIds already applied
    } finally {
      setFetchingMods(false);
    }
  }, [allModules]);

  const handleStudentChange = async (studentId: string) => {
    const s = students.find(x => x._id === studentId);
    setForm(f => ({ ...f, studentId, moduleId: '', batch: s?.batch ?? f.batch }));
    setRegisteredModuleIds([]);
    if (!studentId || !s) return;
    await loadEnrollmentForStudent(s);
  };

  // In edit mode the student is pre-selected in the form but handleStudentChange
  // is never called, so populate enrolled modules once students + modules are ready.
  useEffect(() => {
    if (!isEdit || students.length === 0 || allModules.length === 0) return;
    if (enrollmentInitedRef.current) return;
    enrollmentInitedRef.current = true;
    const s = students.find(x => x._id === form.studentId || x.studentId === form.studentId);
    if (s) loadEnrollmentForStudent(s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, students, allModules]);

  // Show only the modules this student has previously paid for.
  // Falls back to all modules if no payment history is found (first-time student).
  const filteredModules = useMemo(() => {
    if (!form.studentId || registeredModuleIds.length === 0) return allModules;
    const filtered = allModules.filter(m => registeredModuleIds.includes(m.id));
    return filtered.length > 0 ? filtered : allModules;
  }, [form.studentId, registeredModuleIds, allModules]);

  const isFiltered =
    form.studentId.length > 0 &&
    !fetchingMods &&
    filteredModules.length < allModules.length &&
    filteredModules.length > 0;

  // True when a student is selected and we finished fetching but found no
  // enrollment data from either source — filteredModules falls back to all.
  const showingAllModulesFallback =
    form.studentId.length > 0 &&
    !fetchingMods &&
    registeredModuleIds.length === 0;

  const handleSubmit = async () => {
    if (!form.studentId || !form.moduleId || !form.amount || !form.paidDate) {
      toast.error('Please fill all required fields');
      return;
    }
    const student   = students.find(s => s._id === form.studentId);
    const moduleRec = allModules.find(m => m.id === form.moduleId);
    const payload: CreatePaymentPayload = {
      studentId:   form.studentId,
      studentName: student?.name,
      moduleId:    form.moduleId,
      moduleName:  moduleRec?.name,
      amount:      Number(form.amount),
      paidDate:    form.paidDate,
      method:      form.method,
      status:      form.status,
      batch:       form.batch || student?.batch || 'N/A',
      notes:       form.notes || undefined,
    };
    setSaving(true);
    try {
      let result: PaymentRecord;
      if (isEdit && initialData) {
        result = await paymentApi.update(initialData.id, payload);
        toast.success('Payment updated successfully!');
      } else {
        result = await paymentApi.create(payload);
        toast.success('Payment recorded successfully!');
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr?.response?.data?.message
        ?? (isEdit ? 'Failed to update payment' : 'Failed to save payment');
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg as string));
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? 'Edit Payment' : 'Record New Payment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1">
            <Label text="Student" required />
            <select value={form.studentId} onChange={e => handleStudentChange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select student…</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.studentId}) — {s.status}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label text="Module" required />
              {fetchingMods && (
                <span className="text-xs text-gray-400">Loading…</span>
              )}
              {isFiltered && (
                <span className="text-xs text-indigo-500 font-medium">
                  {filteredModules.length} enrolled module{filteredModules.length !== 1 ? 's' : ''}
                </span>
              )}
              {showingAllModulesFallback && (
                <span className="text-xs text-amber-500">No enrolment data — showing all</span>
              )}
            </div>
            <select
              value={form.moduleId}
              onChange={e => setForm(f => ({ ...f, moduleId: e.target.value }))}
              disabled={!form.studentId || fetchingMods}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="">
                {fetchingMods ? 'Loading modules…' : form.studentId ? 'Select module…' : 'Select a student first'}
              </option>
              {filteredModules.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label text="Amount (LKR)" required />
            <input type="number" min={0} value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 10000"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <Label text="Payment Date" required />
            <input type="date" value={form.paidDate}
              onChange={e => setForm(f => ({ ...f, paidDate: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <Label text="Method" required />
            <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as 'cash' | 'bank' | 'online' }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label text="Status" required />
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'paid' | 'pending' | 'overdue' }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label text="Batch" />
            <input type="text" value={form.batch}
              onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}
              placeholder="e.g. May 2025 Batch"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <Label text="Notes" />
            <textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Optional notes…"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : isEdit
              ? <Edit2 className="w-4 h-4" />
              : <Plus  className="w-4 h-4" />}
            {saving ? 'Saving…' : isEdit ? 'Update Payment' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Student Row in TABLE view — click to expand 12-month tracking inline ──────
function StudentTableRow({
  studentId,
  studentName,
  studentIdCode,
  payments,
  year,
  token,
  onDownloadSlip,
  onEditPayment,
}: {
  studentId: string;
  studentName: string;
  studentIdCode: string;
  payments: PaymentRecord[];
  year: number;
  token: string | null;
  onDownloadSlip: (p: PaymentRecord) => void;
  onEditPayment:  (p: PaymentRecord) => void;
}) {
  const [expanded,     setExpanded]     = useState(false);
  const [tracking,     setTracking]     = useState<StudentTracking | null>(null);
  const [loadingTrack, setLoadingTrack] = useState(false);

  // Earliest payment month across all time → only generate pending from that month
  const fromMonth = useMemo(() => {
    if (payments.length === 0) return `${year}-01`;
    const earliest = [...payments]
      .sort((a, b) => a.paidDate.localeCompare(b.paidDate))[0]
      .paidDate.slice(0, 7);               // "YYYY-MM"
    const [eYear] = earliest.split('-').map(Number);
    // Student started before this year → all months in view are active
    if (eYear < year) return `${year}-01`;
    // Student started after this year → nothing to show
    if (eYear > year) return `${year}-12`;
    return earliest;
  }, [payments, year]);

  const toggleTracking = useCallback(async () => {
    if (tracking) { setExpanded(e => !e); return; }
    setLoadingTrack(true);
    try {
      const res  = await fetch(
        `http://localhost:4000/api/payments/student/${studentId}/tracking?year=${year}&from=${fromMonth}&to=${year}-12`,
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
  }, [studentId, year, token, tracking, fromMonth]);

  const paidSet    = useMemo(() => new Set(tracking?.paidMonths    ?? []), [tracking]);
  const pendingSet = useMemo(() => new Set(tracking?.pendingMonths ?? []), [tracking]);

  const firstPayment = payments[0];

  return (
    <>
      {/* ── Main table row ── */}
      <tr
        className="hover:bg-indigo-50/40 transition-colors cursor-pointer border-t border-gray-100"
        onClick={toggleTracking}
      >
        <td className="px-4 py-3 text-xs font-mono text-gray-500">
          {firstPayment?.receiptNo ?? '—'}
          {payments.length > 1 && (
            <span className="ml-1 text-[10px] text-indigo-400">+{payments.length - 1}</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {loadingTrack
              ? <Loader2     className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
              : expanded
              ? <ChevronUp   className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gray-400   flex-shrink-0" />}
            <div>
              <p className="text-sm font-semibold text-gray-800">{studentName}</p>
              <p className="text-xs text-gray-400 font-mono">{studentIdCode}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {firstPayment?.moduleName ?? '—'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {firstPayment?.batch ?? '—'}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-gray-800">
          LKR {(firstPayment?.amount ?? 0).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 capitalize">
          {firstPayment?.method ?? '—'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {firstPayment?.paidDate ?? '—'}
        </td>
        <td className="px-4 py-3">
          {firstPayment && (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(firstPayment.status)}`}>
              {statusIcon(firstPayment.status)} {firstPayment.status}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {firstPayment && (
            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); onDownloadSlip(firstPayment); }}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Download className="w-3 h-3" /> Slip
              </button>
              <button
                onClick={e => { e.stopPropagation(); onEditPayment(firstPayment); }}
                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* ── Expanded: 12-month tracking + all payment records ── */}
      {expanded && (
        <tr>
          <td colSpan={9} className="p-0">
            <div className="bg-indigo-50/50 border-t border-b border-indigo-100 px-6 py-5">

              {/* Month pills */}
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">
                12-Month Payment Status — {studentName} — {year}
              </p>
              <div className="flex gap-2 flex-wrap mb-5">
                {MONTHS.map(({ num, label }) => {
                  const key        = `${year}-${num}`;
                  const isPaid     = paidSet.has(key);
                  const isPending  = pendingSet.has(key);
                  // Months before the student's join month — not applicable
                  const isBeforeJoin = tracking && key < fromMonth;
                  return (
                    <div key={num} className="flex flex-col items-center gap-1">
                      <span className={`text-[10px] font-medium ${isBeforeJoin ? 'text-gray-200' : 'text-gray-400'}`}>{label}</span>
                      {!tracking
                        ? <span className="w-8 h-8 rounded-full bg-gray-100 inline-flex items-center justify-center">
                            <Loader2 className="w-3 h-3 text-gray-300 animate-spin" />
                          </span>
                        : isBeforeJoin
                        ? <span className="w-8 h-8 rounded-full bg-gray-50 border border-dashed border-gray-200 inline-flex items-center justify-center text-[10px] text-gray-200" title={`${label} – Before enrollment`}>—</span>
                        : isPaid
                        ? <span className="w-8 h-8 rounded-full bg-emerald-100 inline-flex items-center justify-center" title={`${label} – Paid`}>
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </span>
                        : isPending
                        ? <span className="w-8 h-8 rounded-full bg-amber-100 inline-flex items-center justify-center" title={`${label} – Pending`}>
                            <Clock className="w-4 h-4 text-amber-500" />
                          </span>
                        : <span className="w-8 h-8 rounded-full bg-gray-100 inline-flex items-center justify-center text-[10px] text-gray-300">—</span>
                      }
                    </div>
                  );
                })}
                {tracking && (
                  <div className="ml-auto flex items-end gap-3 pb-1">
                    <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> {paidSet.size} Paid
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                      <Clock className="w-3.5 h-3.5" /> {pendingSet.size} Pending
                    </span>
                  </div>
                )}
              </div>

              {/* All payment records for this student */}
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                All Payment Records
              </p>
              {payments.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-indigo-100">
                  <table className="w-full text-sm bg-white">
                    <thead>
                      <tr className="bg-indigo-50 border-b border-indigo-100">
                        {['Receipt No', 'Module', 'Amount', 'Method', 'Date', 'Status', 'Actions'].map(h => (
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
                            <div className="flex items-center gap-2">
                              <button
                                onClick={e => { e.stopPropagation(); onDownloadSlip(p); }}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                              >
                                <Download className="w-3 h-3" /> Slip
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); onEditPayment(p); }}
                                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No payment records for this student.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PaymentMobileCard({
  studentId,
  studentName,
  payments,
  year,
  token,
  onDownloadSlip,
  onEditPayment,
}: {
  studentId: string;
  studentName: string;
  payments: PaymentRecord[];
  year: number;
  token: string | null;
  onDownloadSlip: (p: PaymentRecord) => void;
  onEditPayment: (p: PaymentRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tracking, setTracking] = useState<StudentTracking | null>(null);
  const [loadingTrack, setLoadingTrack] = useState(false);

  const fromMonth = useMemo(() => {
    if (payments.length === 0) return `${year}-01`;
    const earliest = [...payments]
      .sort((a, b) => a.paidDate.localeCompare(b.paidDate))[0]
      .paidDate.slice(0, 7);
    const [eYear] = earliest.split('-').map(Number);
    if (eYear < year) return `${year}-01`;
    if (eYear > year) return `${year}-12`;
    return earliest;
  }, [payments, year]);

  const toggleTracking = useCallback(async () => {
    if (tracking) {
      setExpanded(e => !e);
      return;
    }

    setLoadingTrack(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/payments/student/${studentId}/tracking?year=${year}&from=${fromMonth}&to=${year}-12`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      setTracking(json.data ?? json);
      setExpanded(true);
    } catch {
      toast.error('Failed to load tracking for ' + studentId);
    } finally {
      setLoadingTrack(false);
    }
  }, [fromMonth, studentId, token, tracking, year]);

  const paidSet = useMemo(() => new Set(tracking?.paidMonths ?? []), [tracking]);
  const pendingSet = useMemo(() => new Set(tracking?.pendingMonths ?? []), [tracking]);
  const firstPayment = payments[0];

  if (!firstPayment) return null;

  return (
    <article className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
      <div className="p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-indigo-600">
              {firstPayment.receiptNo}
              {payments.length > 1 && (
                <span className="ml-1 text-indigo-400">+{payments.length - 1}</span>
              )}
            </p>
            <h3 className="mt-1 truncate text-sm font-bold uppercase leading-tight text-gray-800">
              {studentName}
            </h3>
            <p className="text-[11px] font-medium text-gray-500">{studentId}</p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${statusColor(firstPayment.status)}`}>
            {statusIcon(firstPayment.status)}
            {firstPayment.status}
          </span>
        </div>

        <div className="mb-3 grid grid-cols-[1fr_auto] gap-4 border-b border-gray-100 pb-3">
          <div>
            <p className="text-[10px] font-medium text-gray-400">Amount</p>
            <p className="text-base font-bold text-gray-900">
              LKR {firstPayment.amount.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium text-gray-400">Method</p>
            <p className="text-xs font-semibold capitalize text-gray-700">{firstPayment.method}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onDownloadSlip(firstPayment)}
              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
            >
              <Download className="h-3 w-3" /> Slip
            </button>
            <button
              type="button"
              onClick={() => onEditPayment(firstPayment)}
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-500"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          </div>
          <button
            type="button"
            onClick={toggleTracking}
            className="rounded p-1 text-gray-500"
            aria-label="Toggle payment history"
          >
            {loadingTrack ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            ) : expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-indigo-50 bg-indigo-50/40 px-3 py-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
            12-Month Payment Status - {year}
          </p>
          <div className="mb-4 grid grid-cols-6 gap-2">
            {MONTHS.map(({ num, label }) => {
              const key = `${year}-${num}`;
              const isPaid = paidSet.has(key);
              const isPending = pendingSet.has(key);
              const isBeforeJoin = tracking && key < fromMonth;

              return (
                <div key={num} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-semibold text-gray-400">{label.charAt(0)}</span>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                    isBeforeJoin
                      ? 'border border-dashed border-gray-200 bg-white text-gray-200'
                      : isPaid
                        ? 'bg-emerald-500 text-white'
                        : isPending
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-gray-100 text-gray-300'
                  }`}>
                    {isPaid ? <CheckCircle className="h-3.5 w-3.5" /> : label.charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
            History
          </p>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="rounded-md border border-indigo-50 bg-white px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-700">{p.moduleName}</p>
                    <p className="text-[10px] text-gray-400">{p.paidDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-800">LKR {p.amount.toLocaleString()}</p>
                    <p className={`text-[9px] font-bold uppercase ${p.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {p.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const [payments,     setPayments]     = useState<PaymentRecord[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPayment,  setEditPayment]  = useState<PaymentRecord | null>(null);
  const [trackingYear, setTrackingYear] = useState(new Date().getFullYear());

  const [search,       setSearch]       = useState('');
  const [filterBatch,  setFilterBatch]  = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const token = useMemo(() => {
    try {
      const auth = localStorage.getItem('techna-auth') || localStorage.getItem('edu-auth') || '';
      return JSON.parse(auth)?.state?.token ?? null;
    } catch { return null; }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError(null);
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

  const studentGroups = useMemo(() => {
    const map = new Map<string, {
      studentId: string; studentName: string;
      batch: string;     payments: PaymentRecord[];
    }>();
    filtered.forEach(p => {
      if (!map.has(p.studentId))
        map.set(p.studentId, {
          studentId:   p.studentId,
          studentName: p.studentName,
          batch:       p.batch,
          payments:    [],
        });
      map.get(p.studentId)!.payments.push(p);
    });
    return Array.from(map.values());
  }, [filtered]);

  const totalPaid    = filtered.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = filtered.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);

  const generatePaymentSlip = (payment: PaymentRecord) => {
    const drawPDF = (logoDataUrl?: string) => {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W   = pdf.internal.pageSize.getWidth();   // 297 mm
      const H   = pdf.internal.pageSize.getHeight();  // 210 mm

      // ── Top cyan bar ───────────────────────────────────────────────────────
      pdf.setFillColor(0, 174, 219);
      pdf.rect(0, 0, W, 8, 'F');

      // ── White header background ────────────────────────────────────────────
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 8, W, 54, 'F');

      // ── Logo (left side, vertically centred in the header) ────────────────
      if (logoDataUrl) {
        try {
          const mimeMatch = logoDataUrl.match(/^data:image\/(\w+);base64,/);
          const imgType   = mimeMatch ? mimeMatch[1].toUpperCase() : 'PNG';
          const imgProps  = pdf.getImageProperties(logoDataUrl);
          const boxSize   = 40;
          const ratio     = imgProps.width / imgProps.height;
          const logoW     = ratio >= 1 ? boxSize : boxSize * ratio;
          const logoH     = ratio >= 1 ? boxSize / ratio : boxSize;
          const headerTop    = 8;
          const headerHeight = 54;
          const logoX        = 10;
          const logoY        = headerTop + (headerHeight - logoH) / 2;
          pdf.addImage(logoDataUrl, imgType, logoX, logoY, logoW, logoH);
        } catch (err) {
          console.warn('Logo could not be added to PDF:', err);
        }
      }

      // ── TECHNA bold centered ───────────────────────────────────────────────
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(30);
      pdf.setTextColor(0, 174, 219);
      pdf.text('TECHNA', W / 2, 32, { align: 'center' });

      // ── Email & Contact line ───────────────────────────────────────────────
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Email: sivasakthy22@gmail.com  |  Contact: +94 77 170 3549', W / 2, 43, { align: 'center' });

      // ── PAYMENT RECEIPT subtitle ───────────────────────────────────────────
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(0, 174, 219);
      pdf.text('PAYMENT RECEIPT', W / 2, 55, { align: 'center' });

      // ── Cyan divider line ──────────────────────────────────────────────────
      pdf.setDrawColor(0, 174, 219);
      pdf.setLineWidth(0.6);
      pdf.line(12, 64, W - 12, 64);

      // ── Two-column layout ──────────────────────────────────────────────────
      const colL     = 14;
      const colR     = W / 2 + 10;
      const colWidth = W / 2 - 22;
      let   yL       = 74;
      let   yR       = 74;

      const sectionTitle = (title: string, x: number, y: number): number => {
        pdf.setFillColor(0, 174, 219);
        pdf.rect(x, y, 3, 8, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 120, 180);
        pdf.text(title, x + 6, y + 6);
        return y + 14;
      };

      const dataRow = (
        label: string,
        value: string,
        x: number,
        y: number,
        shade: boolean,
      ): number => {
        if (shade) {
          pdf.setFillColor(240, 250, 255);
          pdf.rect(x, y - 4, colWidth, 9, 'F');
        }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(100, 110, 130);
        pdf.text(label, x + 3, y + 2);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(30, 30, 30);
        pdf.text(value, x + 52, y + 2);
        return y + 10;
      };

      // ── LEFT column: Student Information ──────────────────────────────────
      yL = sectionTitle('STUDENT INFORMATION', colL, yL);
      yL = dataRow('Student Name', payment.studentName,    colL, yL, true);
      yL = dataRow('Student ID',   payment.studentCode || payment.studentId, colL, yL, false);
      yL = dataRow('Batch',        payment.batch || 'N/A', colL, yL, true);
      yL = dataRow('Receipt No',   payment.receiptNo,      colL, yL, false);

      // ── RIGHT column: Payment Details ─────────────────────────────────────
      yR = sectionTitle('PAYMENT DETAILS', colR, yR);
      yR = dataRow('Module',         payment.moduleName,           colR, yR, true);
      yR = dataRow('Payment Date',   payment.paidDate,             colR, yR, false);
      yR = dataRow('Payment Method', payment.method.toUpperCase(), colR, yR, true);

      // ── Status row — bold colored value ───────────────────────────────────
      {
        const statusColorMap: Record<string, [number, number, number]> = {
          paid:    [22, 163, 74],
          pending: [217, 119, 6],
          overdue: [220, 38, 38],
        };
        const [cr, cg, cb] = statusColorMap[payment.status] ?? [100, 100, 100];
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(100, 110, 130);
        pdf.text('Status', colR + 3, yR + 2);
        pdf.setTextColor(cr, cg, cb);
        pdf.text(payment.status.toUpperCase(), colR + 52, yR + 2);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        yR += 10;
      }

      // ── Amount box (full width) ────────────────────────────────────────────
      const amtY = Math.max(yL, yR) + 8;
      pdf.setFillColor(0, 174, 219);
      pdf.roundedRect(colL, amtY, W - 28, 26, 5, 5, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(210, 240, 255);
      pdf.text('TOTAL AMOUNT PAID', W / 2, amtY + 9, { align: 'center' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`LKR ${payment.amount.toLocaleString()}`, W / 2, amtY + 20, { align: 'center' });

      // ── Footer cyan bar ────────────────────────────────────────────────────
      pdf.setFillColor(0, 174, 219);
      pdf.rect(0, H - 14, W, 14, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Techna', W / 2, H - 7, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(210, 240, 255);
      pdf.text('Generated by Techna · Thank you for your payment!', W / 2, H - 2, { align: 'center' });

      pdf.save(`receipt-${payment.receiptNo}.pdf`);
      toast.success('Receipt downloaded!');
    };

    fetch('/logo.png')
      .then(res => {
        if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`);
        return res.blob();
      })
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror  = reject;
        reader.readAsDataURL(blob);
      }))
      .then(dataUrl => drawPDF(dataUrl))
      .catch(() => {
        console.warn('Logo not found or failed to load — generating receipt without logo.');
        drawPDF();
      });
  };

  const generateAllPDF = () => {
    if (filtered.length === 0) { toast.error('No records to export'); return; }

    const drawPDF = (logoDataUrl?: string) => {
      const pdf    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W      = pdf.internal.pageSize.getWidth();   // 297mm
      const H      = pdf.internal.pageSize.getHeight();  // 210mm
      const margin  = 12;
      const usableW = W - margin * 2;                    // 273mm
      const dateStr = new Date().toISOString().split('T')[0];

      // ── Top cyan bar ────────────────────────────────────────────────────────
      pdf.setFillColor(0, 174, 219);
      pdf.rect(0, 0, W, 8, 'F');

      // ── White header background ─────────────────────────────────────────────
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 8, W, 52, 'F');

      // ── Logo (same loading + sizing as generatePaymentSlip) ─────────────────
      if (logoDataUrl) {
        try {
          const mimeMatch = logoDataUrl.match(/^data:image\/(\w+);base64,/);
          const imgType   = mimeMatch ? mimeMatch[1].toUpperCase() : 'PNG';
          const imgProps  = pdf.getImageProperties(logoDataUrl);
          const boxH      = 36;
          const ratio     = imgProps.width / imgProps.height;
          const logoW     = boxH * ratio;
          const logoH     = boxH;
          const logoY     = 8 + (52 - logoH) / 2;
          pdf.addImage(logoDataUrl, imgType, margin, logoY, logoW, logoH);
        } catch (err) {
          console.warn('Logo could not be added to PDF:', err);
        }
      }

      // ── TECHNA title ────────────────────────────────────────────────────────
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.setTextColor(0, 174, 219);
      pdf.text('TECHNA', W / 2, 30, { align: 'center' });

      // ── Contact line ────────────────────────────────────────────────────────
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Email: sivasakthy22@gmail.com  |  Contact: +94 77 170 3549', W / 2, 40, { align: 'center' });

      // ── PAYMENT REPORT subtitle ─────────────────────────────────────────────
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(0, 174, 219);
      pdf.text('PAYMENT REPORT', W / 2, 51, { align: 'center' });

      // ── Cyan divider ────────────────────────────────────────────────────────
      pdf.setDrawColor(0, 174, 219);
      pdf.setLineWidth(0.6);
      pdf.line(margin, 62, W - margin, 62);

      // ── Meta line ───────────────────────────────────────────────────────────
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated: ${dateStr}  |  Total Records: ${filtered.length}`, W / 2, 68, { align: 'center' });

      // ── Summary boxes ───────────────────────────────────────────────────────
      const boxY   = 72;
      const boxH   = 14;
      const boxGap = 4;
      const boxW   = (usableW - boxGap * 2) / 3;

      pdf.setFillColor(232, 252, 245);
      pdf.roundedRect(margin, boxY, boxW, boxH, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(22, 163, 74);
      pdf.text(`Total Collected: LKR ${totalPaid.toLocaleString()}`, margin + boxW / 2, boxY + 9, { align: 'center' });

      pdf.setFillColor(255, 251, 235);
      pdf.roundedRect(margin + boxW + boxGap, boxY, boxW, boxH, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(180, 120, 0);
      pdf.text(`Pending / Overdue: LKR ${totalPending.toLocaleString()}`, margin + boxW + boxGap + boxW / 2, boxY + 9, { align: 'center' });

      pdf.setFillColor(240, 249, 255);
      pdf.roundedRect(margin + (boxW + boxGap) * 2, boxY, boxW, boxH, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(0, 120, 180);
      pdf.text(`Total Records: ${filtered.length}`, margin + (boxW + boxGap) * 2 + boxW / 2, boxY + 9, { align: 'center' });

      // ── Table ───────────────────────────────────────────────────────────────
      const tableY  = boxY + boxH + 8;
      const rowH    = 8;
      const headerH = 10;

      // Column widths — total = 55+43+48+35+28+20+26+18 = 273mm = usableW ✓
      const cols: { header: string; w: number }[] = [
        { header: 'Receipt No', w: 55 },
        { header: 'Student',    w: 43 },
        { header: 'Module',     w: 48 },
        { header: 'Batch',      w: 35 },
        { header: 'Amount',     w: 28 },
        { header: 'Method',     w: 20 },
        { header: 'Date',       w: 26 },
        { header: 'Status',     w: 18 },
      ];

      // Truncate text to fit column (~1.45mm per char at 8pt helvetica)
      const fitText = (text: string, maxMm: number): string => {
        if (!text) return '';
        const maxChars = Math.floor(maxMm / 1.45);
        return text.length <= maxChars ? text : text.slice(0, maxChars - 1) + '…';
      };

      const drawTableHeader = (startY: number) => {
        pdf.setFillColor(0, 174, 219);
        pdf.rect(margin, startY, usableW, headerH, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        let hx = margin;
        cols.forEach(col => { pdf.text(col.header, hx + 2, startY + 7); hx += col.w; });
      };

      drawTableHeader(tableY);

      const rows = filtered.map(p => [
        p.receiptNo   ?? '',
        p.studentName ?? '',
        p.moduleName  ?? '',
        p.batch       ?? '',
        `LKR ${p.amount.toLocaleString()}`,
        p.method  ? p.method.charAt(0).toUpperCase()  + p.method.slice(1)  : '',
        p.paidDate    ?? '',
        p.status  ? p.status.charAt(0).toUpperCase()  + p.status.slice(1)  : '',
      ]);

      let y = tableY + headerH;

      rows.forEach((row, rowIdx) => {
        if (y + rowH > H - 16) {
          pdf.addPage();
          y = 16;
          drawTableHeader(y);
          y += headerH;
        }

        // Alternating row background
        if (rowIdx % 2 === 0) {
          pdf.setFillColor(255, 255, 255);
        } else {
          pdf.setFillColor(240, 250, 254);
        }
        pdf.rect(margin, y, usableW, rowH, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);

        const rawStatus = filtered[rowIdx]?.status ?? '';
        let cx = margin;

        row.forEach((cell, colIdx) => {
          const colW = cols[colIdx].w;
          if (colIdx === 7) {
            if      (rawStatus === 'paid')    pdf.setTextColor(22, 163, 74);
            else if (rawStatus === 'pending') pdf.setTextColor(217, 119, 6);
            else if (rawStatus === 'overdue') pdf.setTextColor(220, 38, 38);
            else                              pdf.setTextColor(50, 50, 50);
          } else {
            pdf.setTextColor(50, 50, 50);
          }
          pdf.text(fitText(cell, colW), cx + 2, y + 5.5);
          cx += colW;
        });

        // Row separator
        pdf.setDrawColor(224, 224, 224);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y + rowH, margin + usableW, y + rowH);
        y += rowH;
      });

      // ── Footer ──────────────────────────────────────────────────────────────
      pdf.setFillColor(0, 174, 219);
      pdf.rect(0, H - 12, W, 12, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Techna', W / 2, H - 6, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(210, 240, 255);
      pdf.text('Generated by Techna · Thank you!', W / 2, H - 1.5, { align: 'center' });

      pdf.save(`payment-report-${dateStr}.pdf`);
      toast.success('Report exported!');
    };

    fetch('/logo.png')
      .then(res => {
        if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`);
        return res.blob();
      })
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror  = reject;
        reader.readAsDataURL(blob);
      }))
      .then(dataUrl => drawPDF(dataUrl))
      .catch(() => {
        console.warn('Logo not found — generating without logo.');
        drawPDF();
      });
  };

  const handlePaymentSuccess = (updated: PaymentRecord) => {
    setPayments(prev => {
      const idx = prev.findIndex(p => p.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  };

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">

      {/* ── Header ── */}
    <div className="mb-4 flex flex-row items-start justify-between gap-3 sm:mb-6 sm:items-center">
          <div>
          <h1 className="text-lg font-bold text-gray-800 sm:text-2xl">Payments</h1>
          <p className="text-xs text-gray-500 sm:text-sm">{payments.length} total records</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {loading && (
            <div className="hidden items-center gap-2 text-sm text-indigo-500 sm:flex">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          <button onClick={fetchPayments} disabled={loading}
            className="hidden items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 sm:flex sm:px-4">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm">
            <Plus className="w-4 h-4" /> Add Payment
          </button>
          <button onClick={generateAllPDF}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 sm:flex">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {/* ── Summary cards ── */}
      <div className="mb-4 grid grid-cols-1 gap-2 md:mb-6 md:grid-cols-3 md:gap-4">
        <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 sm:h-10 sm:w-10 sm:rounded-xl">
              <CheckCircle className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 sm:text-sm sm:font-normal sm:normal-case sm:tracking-normal">Total Collected</p>
              <p className="text-lg font-bold text-gray-800 sm:text-xl">LKR {totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 sm:h-10 sm:w-10 sm:rounded-xl">
              <Clock className="h-4 w-4 text-amber-600 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 sm:text-sm sm:font-normal sm:normal-case sm:tracking-normal">Pending / Overdue</p>
              <p className="text-lg font-bold text-gray-800 sm:text-xl">LKR {totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 sm:h-10 sm:w-10 sm:rounded-xl">
              <CreditCard className="h-4 w-4 text-indigo-600 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 sm:text-sm sm:font-normal sm:normal-case sm:tracking-normal">Filtered Records</p>
              <p className="text-lg font-bold text-gray-800 sm:text-xl">{filtered.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-row gap-2 sm:mb-5 sm:flex-row sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student name or receipt no…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:rounded-xl sm:text-sm" />
        </div>
        <details className="relative sm:hidden">
          <summary className="flex h-full w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500">
            <Filter className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 grid w-52 gap-2 rounded-lg border border-gray-100 bg-white p-3 shadow-lg">
            <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {BATCHES.map(b => <option key={b} value={b}>{b || 'All Batches'}</option>)}
            </select>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Modules</option>
              {allModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            <select value={trackingYear} onChange={e => setTrackingYear(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </details>
        <div className="hidden items-center gap-2 flex-wrap sm:flex">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {BATCHES.map(b => <option key={b} value={b}>{b || 'All Batches'}</option>)}
          </select>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Modules</option>
            {allModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
          <select value={trackingYear} onChange={e => setTrackingYear(Number(e.target.value))}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="space-y-3 min-[1300px]:hidden">
        {studentGroups.map(s => (
          <PaymentMobileCard
            key={s.studentId}
            studentId={s.studentId}
            studentName={s.studentName}
            payments={s.payments}
            year={trackingYear}
            token={token}
            onDownloadSlip={generatePaymentSlip}
            onEditPayment={setEditPayment}
          />
        ))}

        {!loading && studentGroups.length === 0 && (
          <div className="rounded-lg border border-gray-100 bg-white py-12 text-center text-gray-400">
            <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">No payment records found</p>
            {payments.length > 0 && (
              <p className="mt-1 text-xs">Try adjusting your filters</p>
            )}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm min-[1300px]:block">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Click on a student row to view their 12-month payment history
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                {['Receipt No', 'Student', 'Module', 'Batch', 'Amount', 'Method', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentGroups.map(s => (
                <StudentTableRow
                  key={s.studentId}
                  studentId={s.studentId}
                  studentName={s.studentName}
                  studentIdCode={s.studentId}
                  payments={s.payments}
                  year={trackingYear}
                  token={token}
                  onDownloadSlip={generatePaymentSlip}
                  onEditPayment={setEditPayment}
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
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-5 right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 md:hidden"
        aria-label="Add payment"
      >
        <CreditCard className="h-5 w-5" />
      </button>

      {showAddModal && (
        <PaymentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* ── Edit Payment Modal ── */}
      {editPayment && (
        <PaymentModal
          initialData={editPayment}
          onClose={() => setEditPayment(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
