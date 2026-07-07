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
import CompactSelect from '@/components/ui/CompactSelect';
import CompactDatePicker from '@/components/ui/CompactDatePicker';
import { useDataStore } from '@/store/dataStore';




const MONTHS = [
  { num: '01', label: 'Jan' }, { num: '02', label: 'Feb' },
  { num: '03', label: 'Mar' }, { num: '04', label: 'Apr' },
  { num: '05', label: 'May' }, { num: '06', label: 'Jun' },
  { num: '07', label: 'Jul' }, { num: '08', label: 'Aug' },
  { num: '09', label: 'Sep' }, { num: '10', label: 'Oct' },
  { num: '11', label: 'Nov' }, { num: '12', label: 'Dec' },
];

// ── Fee Structure ────────────────────────────────────────────────────────────
const FEE_STRUCTURE = {
  subjectFee: 1200,
};

// ── Additional (one-time) fees ──────────────────────────────────────────────
// Each entry here is a fee that is NOT a subject a student studies (Admission
// Fee, ID Card Fee, etc). These are sent to the backend with their own
// `feeType` ('admission' | 'idcard') instead of a moduleId — the backend
// treats them as one-time fees with no Module lookup and no monthly
// (student, module, month) uniqueness check, so they never collide with a
// subject's payment slot and never require a matching Module record.
//
// To add a new fee later (e.g. client asks for another one-time charge),
// add an entry here with a matching `id`, and add that same id to the
// feeType union type in payment.api.ts (CreatePaymentPayload / PaymentRecord)
// and to the backend's feeType enum — no other frontend code changes needed.
const ADDITIONAL_FEES: { id: string; label: string; defaultAmount: number }[] = [
  { id: 'admission', label: 'Admission Fee', defaultAmount: 500 },
  { id: 'idcard',    label: 'ID Card Fee',   defaultAmount: 300 },
];

interface ModuleRef {
  id?: string;
  name?: string;
}

interface StudentOption {
  _id:        string;
  studentId:  string;
  name:       string;
  batch:      string;
  moduleRefs: ModuleRef[];
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

function isApprovedStudent(student: Record<string, unknown>): boolean {
  const statusCandidates = [
    student.status,
    student.studentStatus,
    student.approvalStatus,
    student.applicationStatus,
  ];

  return statusCandidates.some((value) =>
    String(value ?? '').trim().toLowerCase() === 'approved',
  );
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

const statusIcon = (s: string) =>
  s === 'paid'    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> :
  s === 'pending' ? <Clock       className="w-3.5 h-3.5 text-amber-500"   /> :
                    <AlertCircle className="w-3.5 h-3.5 text-red-500"     />;

const statusColor = (s: string) =>
  s === 'paid'    ? 'bg-emerald-100 text-emerald-700' :
  s === 'pending' ? 'bg-amber-100  text-amber-700'    :
                    'bg-red-100    text-red-700';

const normalizeModuleName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Robust extraction of a single module reference (string | ObjectId | {_id,name,...}) ──
function extractModuleRef(m: unknown): ModuleRef {
  if (typeof m === 'string') {
    return { id: m, name: m };
  }
  if (m && typeof m === 'object') {
    const obj = m as Record<string, unknown>;
    const id =
      (obj._id ?? obj.id ?? obj.moduleId ?? obj.module_id) as string | undefined;
    const name =
      (obj.name ?? obj.moduleName ?? obj.module_name ?? obj.title) as string | undefined;
    return {
      id:   id ? String(id) : undefined,
      name: name ? String(name) : undefined,
    };
  }
  return {};
}

// ── Try several possible field names a student record might store enrolled modules under ──
function extractStudentModules(s: Record<string, unknown>): unknown[] {
  const candidates = [
    s.modules,
    s.enrolledModules,
    s.registeredModules,
    s.moduleIds,
    s.subjects,
    s.courses,
    s.registeredSubjects,
    s.mainSubjects && s.basketSubject
      ? [
          ...(Array.isArray(s.mainSubjects) ? s.mainSubjects : []),
          s.basketSubject,
        ]
      : undefined,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return [];
}

// ── Payment Modal (Add + Edit) ─────────────────────────────────────────────────
function PaymentModal({
  onClose,
  onSuccess,
  initialData,
  batches = [],
}: {
  onClose: () => void;
  onSuccess: (p: PaymentRecord) => void;
  initialData?: PaymentRecord | null;
  batches?: string[];
}) {
  const isEdit = !!initialData;
  const [students,            setStudents]            = useState<StudentOption[]>([]);
  const [allModules,          setAllModules]          = useState<ModuleOption[]>([]);
  const [registeredModuleIds, setRegisteredModuleIds] = useState<string[]>([]);
  const [unmatchedNames,      setUnmatchedNames]      = useState<string[]>([]);
  const [fetchingMods,        setFetchingMods]        = useState(false);
  const [saving,              setSaving]              = useState(false);
  const [isFirstPayment,      setIsFirstPayment]      = useState(false);
  const enrollmentInitedRef = useRef(false);

  const [form, setForm] = useState({
    studentId: initialData?.studentId ?? '',
    paidDate:  initialData?.paidDate  ?? new Date().toISOString().split('T')[0],
    method:    (initialData?.method   ?? 'cash') as 'cash' | 'bank' | 'online',
    status:    (initialData?.status   ?? 'paid') as 'paid' | 'pending' | 'overdue',
    batch:     initialData?.batch     ?? '',
    notes:     initialData?.notes     ?? '',
  });

  // ── Multi-subject selection state (used in BOTH Add and Edit mode). In Add
  // mode this starts empty; in Edit mode it's seeded from every payment
  // record that shares the same student + payment date as the record being
  // edited, so the whole "batch" of subjects/fees recorded that day can be
  // reviewed and adjusted together, not just the single record clicked. ──
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [subjectFees,       setSubjectFees]       = useState<Record<string, string>>({});

  // ── Additional one-time fees (Admission, ID Card, etc.) — used in BOTH modes. ──
  // includedFeeIds holds the ids of ADDITIONAL_FEES currently checked;
  // feeAmounts holds their (editable) amounts, keyed by the same id.
  const [includedFeeIds, setIncludedFeeIds] = useState<string[]>([]);
  const [feeAmounts,     setFeeAmounts]     = useState<Record<string, string>>(
    Object.fromEntries(ADDITIONAL_FEES.map(f => [f.id, String(f.defaultAmount)]))
  );

  // ── Edit mode only: maps a selection key ("subject:<moduleId>" or
  // "fee:<feeType>") to the ALREADY-SAVED PaymentRecord it corresponds to.
  // On submit, keys present here are updated (paymentApi.update); keys with
  // no entry here are brand new and get created (paymentApi.create). Items
  // that existed here but get unchecked are simply left untouched on the
  // server — this UI can add and edit records, not delete them. ──
  const [existingRecordMap, setExistingRecordMap] = useState<Record<string, PaymentRecord>>({});

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

        // Debug: uncomment temporarily if a student's modules still don't show up,
        // then check the console to see the real field name used for their modules.
        // console.log('sample student raw:', sArr[0]);
        // console.log('all modules raw:', mArr);

        const approvedStudents = sArr.filter((s) =>
          isApprovedStudent(s as Record<string, unknown>)
        );

        setStudents(
          approvedStudents.map(s => ({
            _id:        (s._id ?? s.id ?? s.studentId) as string,
            studentId:  s.studentId as string,
            name:       (s.fullNameEnglish ?? s.name ?? s.studentId) as string,
            batch:      (s.batch ?? '') as string,
            moduleRefs: extractStudentModules(s as Record<string, unknown>).map(extractModuleRef),
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

  const loadEnrollmentForStudent = useCallback(async (s: StudentOption) => {
    // Track which of the student's raw subject/module refs actually found a
    // matching record in the Modules list, so we can surface anything that
    // didn't match (usually means that subject has no Module record yet).
    const matchedRefLabels = new Set<string>();

    const nameBasedIds = s.moduleRefs.length > 0
      ? allModules
          .filter(m => s.moduleRefs.some(ref => {
            const label = ref.name ?? ref.id ?? '';
            // 1. Direct ID match (covers real ObjectId / moduleId refs — NOT
            //    plain subject-name strings, which get id === name and will
            //    simply never equal a real Mongo _id, so this is safe).
            if (ref.id && ref.id === m.id) {
              matchedRefLabels.add(label);
              return true;
            }
            // 2. Name match: exact -> then loose substring -> then word-overlap,
            //    so naming differences like "Science for Technology" vs
            //    "Science For Technology" or extra words still match.
            if (ref.name) {
              const normM = normalizeModuleName(m.name);
              const normR = normalizeModuleName(ref.name);
              const isMatch =
                normM === normR ||
                normM.includes(normR) ||
                normR.includes(normM) ||
                (() => {
                  const wordsM = new Set(normM.split(' ').filter(Boolean));
                  const wordsR = normR.split(' ').filter(Boolean);
                  const overlap = wordsR.filter(w => wordsM.has(w)).length;
                  return wordsR.length > 0 && overlap / wordsR.length >= 0.6;
                })();
              if (isMatch) {
                matchedRefLabels.add(label);
                return true;
              }
            }
            return false;
          }))
          .map(m => m.id)
      : [];

    if (nameBasedIds.length > 0) {
      setRegisteredModuleIds(nameBasedIds);
    }

    // Anything the student is registered for that never matched a real
    // Module record — this is the actual list to show Sarmi so there's no
    // need to dig through DevTools to find the mismatch.
    const missing = s.moduleRefs
      .map(ref => ref.name ?? ref.id ?? '')
      .filter(label => label && !matchedRefLabels.has(label));
    setUnmatchedNames([...new Set(missing)]);

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
      // Merge with (don't overwrite) the enrollment-based ids, so a student who
      // has enrolled in 6 modules but only paid for 1 still sees all 6 as options.
      setRegisteredModuleIds(prev => [...new Set([...prev, ...paymentIds])] as string[]);

      if (isEdit && initialData) {
        // ── Edit mode: seed the multi-subject / additional-fee selection from
        // every payment record that shares the same student + payment date as
        // the record being edited (i.e. the whole "batch" recorded that day),
        // so the user can review, edit, and add to all of them at once. ──
        const group = merged.filter(p => p.paidDate === initialData.paidDate);
        if (!group.some(p => p.id === initialData.id)) group.push(initialData);

        const map: Record<string, PaymentRecord> = {};
        const subjIds: string[] = [];
        const subjFeesInit: Record<string, string> = {};
        const feeIdsInit: string[] = [];
        const feeAmountsInit: Record<string, string> = Object.fromEntries(
          ADDITIONAL_FEES.map(f => [f.id, String(f.defaultAmount)])
        );

        group.forEach(p => {
          if (p.feeType && p.feeType !== 'subject') {
            map[`fee:${p.feeType}`] = p;
            feeIdsInit.push(p.feeType);
            feeAmountsInit[p.feeType] = String(p.amount);
          } else if (p.moduleId) {
            map[`subject:${p.moduleId}`] = p;
            subjIds.push(p.moduleId);
            subjFeesInit[p.moduleId] = String(p.amount);
          }
        });

        setExistingRecordMap(map);
        setSelectedModuleIds(subjIds);
        setSubjectFees(subjFeesInit);
        setIncludedFeeIds(feeIdsInit);
        setFeeAmounts(feeAmountsInit);
        setRegisteredModuleIds(prev => [...new Set([...prev, ...subjIds])]);
      } else {
        // First-time payer detection: no prior payment records at all →
        // pre-tick the Admission Fee checkbox for convenience (still editable).
        setIsFirstPayment(merged.length === 0);
        setIncludedFeeIds(merged.length === 0 ? ['admission'] : []);
      }
    } catch {
      // retain nameBasedIds already applied
    } finally {
      setFetchingMods(false);
    }
  }, [allModules, isEdit, initialData]);

  const handleStudentChange = async (studentId: string) => {
    const s = students.find(x => x._id === studentId);
    setForm(f => ({ ...f, studentId, batch: s?.batch ?? f.batch }));
    setRegisteredModuleIds([]);
    setUnmatchedNames([]);
    setSelectedModuleIds([]);
    setSubjectFees({});
    setIsFirstPayment(false);
    setIncludedFeeIds([]);
    setExistingRecordMap({});
    if (!studentId || !s) return;
    await loadEnrollmentForStudent(s);
  };

  useEffect(() => {
    if (!isEdit || students.length === 0 || allModules.length === 0) return;
    if (enrollmentInitedRef.current) return;
    enrollmentInitedRef.current = true;
    const s = students.find(x => x._id === form.studentId || x.studentId === form.studentId);
    if (s) loadEnrollmentForStudent(s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, students, allModules]);

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

  const showingAllModulesFallback =
    form.studentId.length > 0 &&
    !fetchingMods &&
    registeredModuleIds.length === 0;

  // ── Toggle a subject chip on/off, seeding its fee with the default subject fee ──
  const toggleSubject = (moduleId: string) => {
    setSelectedModuleIds(prev => {
      if (prev.includes(moduleId)) {
        return prev.filter(id => id !== moduleId);
      }
      setSubjectFees(f => (
        f[moduleId] != null ? f : { ...f, [moduleId]: String(FEE_STRUCTURE.subjectFee) }
      ));
      return [...prev, moduleId];
    });
  };

  // ── Toggle an additional fee (Admission Fee, ID Card Fee, ...) on/off ──
  const toggleFee = (feeId: string) => {
    setIncludedFeeIds(prev =>
      prev.includes(feeId) ? prev.filter(id => id !== feeId) : [...prev, feeId]
    );
  };

  const totalAmount = useMemo(() => {
    const subjectsTotal = selectedModuleIds.reduce(
      (sum, id) => sum + (Number(subjectFees[id]) || 0),
      0,
    );
    const feesTotal = includedFeeIds.reduce(
      (sum, id) => sum + (Number(feeAmounts[id]) || 0),
      0,
    );
    return subjectsTotal + feesTotal;
  }, [selectedModuleIds, subjectFees, includedFeeIds, feeAmounts]);

  const handleSubmit = async () => {
    // ── Both Add and Edit mode now use the same multi-subject + additional-fees
    // flow. Each selected chip/checkbox becomes one line item. In Edit mode,
    // a line item that matches an ALREADY-SAVED record (via existingRecordMap)
    // is updated in place; anything new gets created as a fresh record. Items
    // that were checked originally but got unchecked are simply left alone on
    // the server — this form can add and edit, but not delete, records. ──
    if (!form.studentId || !form.paidDate) {
      toast.error('Please select a student and payment date');
      return;
    }
    if (selectedModuleIds.length === 0 && includedFeeIds.length === 0) {
      toast.error('Select at least one subject or fee');
      return;
    }

    const student = students.find(s => s._id === form.studentId);

    // ── Plain subject line items — amounts are NEVER touched by extra fees ──
    const subjectLineItems: { key: string; payload: CreatePaymentPayload }[] = selectedModuleIds.map((id) => {
      const moduleRec = allModules.find(m => m.id === id);
      return {
        key: `subject:${id}`,
        payload: {
          studentId:   form.studentId,
          studentName: student?.name,
          moduleId:    id,
          moduleName:  moduleRec?.name,
          feeType:     'subject',
          amount:      Number(subjectFees[id]) || 0,
          paidDate:    form.paidDate,
          method:      form.method,
          status:      form.status,
          batch:       form.batch || student?.batch || 'N/A',
          notes:       form.notes || undefined,
        },
      };
    });

    // ── Extra fees — each its OWN separate payment record. These are sent
    // with `feeType: 'admission' | 'idcard'` and NO moduleId — the backend
    // treats them as one-time fees, skips the Module lookup entirely, and
    // never checks them against the (student, module, month) uniqueness
    // rule, so they never collide with a subject's payment slot and never
    // require a matching Module/Subject record to exist. ──
    const feeLineItems: { key: string; payload: CreatePaymentPayload }[] = includedFeeIds.map(id => {
      const fee = ADDITIONAL_FEES.find(f => f.id === id)!;
      return {
        key: `fee:${id}`,
        payload: {
          studentId:   form.studentId,
          studentName: student?.name,
          feeType:     id as 'admission' | 'idcard',
          moduleName:  fee.label,
          amount:      Number(feeAmounts[id]) || 0,
          paidDate:    form.paidDate,
          method:      form.method,
          status:      form.status,
          batch:       form.batch || student?.batch || 'N/A',
          notes:       form.notes || undefined,
        },
      };
    });

    const lineItems = [...subjectLineItems, ...feeLineItems];

    setSaving(true);
    try {
      // Sequential so receipt numbering / any server-side ordering stays
      // predictable, and a failure partway through is easy to spot instead
      // of firing all requests at once and losing track of which failed.
      let updatedCount = 0;
      let createdCount = 0;
      for (const item of lineItems) {
        const existing = isEdit ? existingRecordMap[item.key] : undefined;
        if (existing) {
          const result = await paymentApi.update(existing.id, item.payload);
          onSuccess(result);
          updatedCount++;
        } else {
          const result = await paymentApi.create(item.payload);
          onSuccess(result);
          createdCount++;
        }
      }

      const parts: string[] = [];
      if (updatedCount) parts.push(`${updatedCount} updated`);
      if (createdCount) parts.push(`${createdCount} added`);
      toast.success(
        parts.length > 0
          ? `Payment ${parts.join(', ')} successfully!`
          : lineItems.length > 1
          ? `${lineItems.length} payments recorded successfully!`
          : 'Payment recorded successfully!'
      );
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr?.response?.data?.message ?? 'Failed to save one or more payments';
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
            <CompactSelect
              value={form.studentId}
              onChange={value => void handleStudentChange(value)}
              options={[
                { value: '', label: 'Select student...' },
                ...students.map(s => ({
                  value: s._id,
                  label: `${s.name} (${s.studentId}) - ${s.status}`,
                })),
              ]}
            />
            <select value={form.studentId} onChange={e => handleStudentChange(e.target.value)}
              className="hidden">
              <option value="">Select student…</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.studentId})
                </option>
              ))}
            </select>
          </div>

          <>
              {/* ── Multi-subject checklist + additional fees — used in both
                   Add mode (fresh selection) and Edit mode (pre-seeded from
                   every record saved for this student on this payment date). ── */}
              <div className="col-span-2 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label text="Subjects / Modules" required />
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

                {!form.studentId ? (
                  <p className="px-3 py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
                    Select a student first
                  </p>
                ) : fetchingMods ? (
                  <p className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading subjects…
                  </p>
                ) : (
                  <>
                    {/* ── Chip toggles: click a subject to select/deselect it ── */}
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50/50">
                      {filteredModules.map(m => {
                        const checked = selectedModuleIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleSubject(m.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              checked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                          >
                            {checked && <CheckCircle className="w-3 h-3 inline-block mr-1 -mt-0.5" />}
                            {m.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* ── Fee editing for whatever is currently selected ── */}
                    {selectedModuleIds.length > 0 && (
                      <div className="mt-2 border border-indigo-100 rounded-xl divide-y divide-indigo-50 overflow-hidden">
                        {selectedModuleIds.map(id => {
                          const mod = allModules.find(m => m.id === id);
                          return (
                            <div key={id} className="flex items-center justify-between gap-3 px-3 py-2 bg-indigo-50/40">
                              <span className="text-sm text-gray-700 truncate">{mod?.name ?? id}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400">LKR</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={subjectFees[id] ?? ''}
                                  onChange={e => setSubjectFees(f => ({ ...f, [id]: e.target.value }))}
                                  className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleSubject(id)}
                                  className="text-gray-400 hover:text-red-500"
                                  aria-label={`Remove ${mod?.name ?? 'subject'}`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                {unmatchedNames.length > 0 && (
                  <p className="mt-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 leading-snug">
                    Registered but no matching Module record found for:{' '}
                    <span className="font-medium">{unmatchedNames.join(', ')}</span>.
                    Add these in Module management, or check the spelling matches
                    exactly what's in the student's subject list.
                  </p>
                )}
              </div>

              {/* ── Additional one-time fees (Admission Fee, ID Card Fee, ...) —
                   each one becomes its own separate payment record with its
                   own feeType, never merged into a subject's amount and never
                   requiring a matching Module/Subject record. ── */}
              <div className="col-span-2 flex flex-col gap-1">
                <Label text="Additional Fees" />
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {ADDITIONAL_FEES.map(fee => {
                    const checked = includedFeeIds.includes(fee.id);
                    return (
                      <div key={fee.id} className="px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFee(fee.id)}
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-700 truncate">
                              {fee.label}
                              {fee.id === 'admission' && isFirstPayment && (
                                <span className="ml-1.5 text-xs text-indigo-500 font-medium">(first payment)</span>
                              )}
                            </span>
                          </label>
                          {checked && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-xs text-gray-400">LKR</span>
                              <input
                                type="number"
                                min={0}
                                value={feeAmounts[fee.id] ?? ''}
                                onChange={e => setFeeAmounts(f => ({ ...f, [fee.id]: e.target.value }))}
                                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Computed total ── */}
              <div className="col-span-2 flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-sm font-medium text-indigo-600">Total Amount</span>
                <span className="text-lg font-bold text-indigo-700">LKR {totalAmount.toLocaleString()}</span>
              </div>
          </>

          <div className="flex flex-col gap-1">
            <Label text="Payment Date" required />
            <CompactDatePicker
              value={form.paidDate}
              onChange={value => setForm(f => ({ ...f, paidDate: value }))}
            />
            <input type="date" value={form.paidDate}
              onChange={e => setForm(f => ({ ...f, paidDate: e.target.value }))}
              className="hidden" />
          </div>
          <div className="flex flex-col gap-1">
            <Label text="Method" required />
            <CompactSelect
              value={form.method}
              onChange={value => setForm(f => ({ ...f, method: value as 'cash' | 'bank' | 'online' }))}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank', label: 'Bank Transfer' },
                { value: 'online', label: 'Online' },
              ]}
            />
            <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as 'cash' | 'bank' | 'online' }))}
              className="hidden">
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label text="Status" required />
            <CompactSelect
              value={form.status}
              onChange={value => setForm(f => ({ ...f, status: value as 'paid' | 'pending' | 'overdue' }))}
              options={[
                { value: 'paid', label: 'Paid' },
                { value: 'pending', label: 'Pending' },
                { value: 'overdue', label: 'Overdue' },
              ]}
            />
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'paid' | 'pending' | 'overdue' }))}
              className="hidden">
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          
          <div className="flex flex-col gap-1">
            <Label text="Batch" />
            <select
              value={form.batch}
              onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select batch…</option>
              {batches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
              {/* keep existing value if it's not in current batch list */}
              {form.batch && !batches.includes(form.batch) && (
                <option value={form.batch}>{form.batch}</option>
              )}
            </select>
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <Label text="Notes" />
            <textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Optional notes…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
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


function StudentTableRow({
  studentId,
  studentName,
  studentIdCode,
  payments,
  year,
  token,
  onDownloadSlip,
  onDownloadAllSlips,
  onEditPayment,
}: {
  studentId: string;
  studentName: string;
  studentIdCode: string;
  payments: PaymentRecord[];
  year: number;
  token: string | null;
  onDownloadSlip: (p: PaymentRecord) => void;
  onDownloadAllSlips: (payments: PaymentRecord[], studentName: string, studentCode: string) => void;
  onEditPayment:  (p: PaymentRecord) => void;
}) {
  const [expanded,     setExpanded]     = useState(false);
  const [tracking,     setTracking]     = useState<StudentTracking | null>(null);
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

  // ── Fetch logic extracted so it can be called both on user click AND
  // automatically whenever this student's payment records change (e.g. a
  // new payment was just added / edited), without needing a full page
  // refresh to see the updated 12-month calendar. ──
  const fetchTracking = useCallback(async () => {
    setLoadingTrack(true);
    try {
      const res  = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000/api'}/payments/student/${studentId}/tracking?year=${year}&from=${fromMonth}&to=${year}-12`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      setTracking(json.data ?? json);
    } catch {
      toast.error('Failed to load tracking for ' + studentId);
    } finally {
      setLoadingTrack(false);
    }
  }, [studentId, year, token, fromMonth]);

  const toggleTracking = useCallback(async () => {
    if (tracking) { setExpanded(e => !e); return; }
    setExpanded(true);
    await fetchTracking();
  }, [tracking, fetchTracking]);

  // ── Auto-refresh: whenever this student's `payments` prop changes (a
  // payment was just added/edited for them), drop the cached tracking data
  // and, if the calendar is currently open, refetch immediately — so the
  // update shows up right away instead of only after a full page refresh. ──
  const paymentsKey = useMemo(
    () => payments.map(p => `${p.id}:${p.amount}:${p.status}:${p.paidDate}`).join('|'),
    [payments]
  );
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setTracking(null);
    if (expanded) fetchTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentsKey]);

  const paidSet    = useMemo(() => new Set(tracking?.paidMonths    ?? []), [tracking]);
  const pendingSet = useMemo(() => new Set(tracking?.pendingMonths ?? []), [tracking]);

  const firstPayment = payments[0];

  return (
    <>
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

      {expanded && (
        <tr>
          <td colSpan={9} className="p-0">
            <div className="bg-indigo-50/50 border-t border-b border-indigo-100 px-6 py-5">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">
                12-Month Payment Status — {studentName} — {year}
              </p>
              <div className="flex gap-2 flex-wrap mb-5">
                {MONTHS.map(({ num, label }) => {
                  const key        = `${year}-${num}`;
                  const isPaid     = paidSet.has(key);
                  const isPending  = pendingSet.has(key);
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

              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                  All Payment Records
                </p>
                {payments.length > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); onDownloadAllSlips(payments, studentName, studentIdCode); }}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 rounded-lg px-2.5 py-1"
                  >
                    <Download className="w-3 h-3" /> Download All
                  </button>
                )}
              </div>
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
  onDownloadAllSlips,
  onEditPayment,
}: {
  studentId: string;
  studentName: string;
  payments: PaymentRecord[];
  year: number;
  token: string | null;
  onDownloadSlip: (p: PaymentRecord) => void;
  onDownloadAllSlips: (payments: PaymentRecord[], studentName: string, studentCode: string) => void;
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

  // ── Fetch logic extracted so it can be triggered both on click AND
  // automatically when this student's payments change (see effect below). ──
  const fetchTracking = useCallback(async () => {
    setLoadingTrack(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000/api'}/payments/student/${studentId}/tracking?year=${year}&from=${fromMonth}&to=${year}-12`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      setTracking(json.data ?? json);
    } catch {
      toast.error('Failed to load tracking for ' + studentId);
    } finally {
      setLoadingTrack(false);
    }
  }, [fromMonth, studentId, token, year]);

  const toggleTracking = useCallback(async () => {
    if (tracking) {
      setExpanded(e => !e);
      return;
    }
    setExpanded(true);
    await fetchTracking();
  }, [tracking, fetchTracking]);

  // ── Auto-refresh: same fix as StudentTableRow — invalidate + refetch the
  // cached tracking data whenever this student's payment records change, so
  // a freshly added/edited payment shows up in the calendar immediately
  // instead of needing a full page refresh. ──
  const paymentsKey = useMemo(
    () => payments.map(p => `${p.id}:${p.amount}:${p.status}:${p.paidDate}`).join('|'),
    [payments]
  );
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setTracking(null);
    if (expanded) fetchTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentsKey]);

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

          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
              History
            </p>
            <button
              type="button"
              onClick={() => onDownloadAllSlips(payments, studentName, studentId)}
              className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-lg px-2 py-1"
            >
              <Download className="h-3 w-3" /> Download All
            </button>
          </div>
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


export default function PaymentsPage() {
  
  const { students, fetchStudents } = useDataStore();

  
  const BATCHES = Array.from(
    new Set(students.map((s: any) => s.batch).filter(Boolean))
  ) as string[];

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

  useEffect(() => {
    fetchPayments();
    fetchStudents(); 
  }, [fetchPayments, fetchStudents]);

  const allModules = Array.from(
    new Map(
      payments
        .filter(p => !!p.moduleId)
        .map(p => [p.moduleId as string, { id: p.moduleId as string, name: p.moduleName }])
    ).values()
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
      const W   = pdf.internal.pageSize.getWidth();
      const H   = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(0, 174, 219);
      pdf.rect(0, 0, W, 8, 'F');

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 8, W, 54, 'F');

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

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(30);
      pdf.setTextColor(0, 174, 219);
      pdf.text('TECHNA', W / 2, 32, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Email: sivasakthy22@gmail.com  |  Contact: +94 77 170 3549', W / 2, 43, { align: 'center' });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(0, 174, 219);
      pdf.text('PAYMENT RECEIPT', W / 2, 55, { align: 'center' });

      pdf.setDrawColor(0, 174, 219);
      pdf.setLineWidth(0.6);
      pdf.line(12, 64, W - 12, 64);

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

      yL = sectionTitle('STUDENT INFORMATION', colL, yL);
      yL = dataRow('Student Name', payment.studentName,    colL, yL, true);
      yL = dataRow('Student ID',   payment.studentCode || payment.studentId, colL, yL, false);
      yL = dataRow('Batch',        payment.batch || 'N/A', colL, yL, true);
      yL = dataRow('Receipt No',   payment.receiptNo,      colL, yL, false);

      yR = sectionTitle('PAYMENT DETAILS', colR, yR);
      yR = dataRow('Module',         payment.moduleName,           colR, yR, true);
      yR = dataRow('Payment Date',   payment.paidDate,             colR, yR, false);
      yR = dataRow('Payment Method', payment.method.toUpperCase(), colR, yR, true);

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

  // ── Combined slip for one student — all their payment records in ONE PDF ──
  const generateStudentAllSlip = (
    studentPayments: PaymentRecord[],
    studentName: string,
    studentCode: string,
  ) => {
    if (studentPayments.length === 0) { toast.error('No records to export'); return; }

    const drawPDF = (logoDataUrl?: string) => {
      const pdf     = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W       = pdf.internal.pageSize.getWidth();
      const H       = pdf.internal.pageSize.getHeight();
      const margin  = 12;
      const usableW = W - margin * 2;
      const dateStr = new Date().toISOString().split('T')[0];
      const total   = studentPayments.reduce((s, p) => s + p.amount, 0);

      pdf.setFillColor(0, 174, 219);
      pdf.rect(0, 0, W, 8, 'F');
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 8, W, 52, 'F');

      if (logoDataUrl) {
        try {
          const mimeMatch = logoDataUrl.match(/^data:image\/(\w+);base64,/);
          const imgType   = mimeMatch ? mimeMatch[1].toUpperCase() : 'PNG';
          const imgProps  = pdf.getImageProperties(logoDataUrl);
          const boxH      = 36;
          const ratio     = imgProps.width / imgProps.height;
          const logoW     = boxH * ratio;
          const logoY     = 8 + (52 - boxH) / 2;
          pdf.addImage(logoDataUrl, imgType, margin, logoY, logoW, boxH);
        } catch (err) {
          console.warn('Logo could not be added to PDF:', err);
        }
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(26);
      pdf.setTextColor(0, 174, 219);
      pdf.text('TECHNA', W / 2, 28, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Email: sivasakthy22@gmail.com  |  Contact: +94 77 170 3549', W / 2, 38, { align: 'center' });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(0, 174, 219);
      pdf.text('COMBINED PAYMENT RECEIPT', W / 2, 49, { align: 'center' });

      pdf.setDrawColor(0, 174, 219);
      pdf.setLineWidth(0.6);
      pdf.line(margin, 58, W - margin, 58);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);
      pdf.text(`Student: ${studentName}  (${studentCode})`, margin, 66);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated: ${dateStr}  |  Total Records: ${studentPayments.length}`, W - margin, 66, { align: 'right' });

      const tableY  = 72;
      const rowH    = 8;
      const headerH = 10;

      const cols: { header: string; w: number }[] = [
        { header: 'Receipt No',   w: 55 },
        { header: 'Module / Fee', w: 70 },
        { header: 'Amount',       w: 32 },
        { header: 'Method',       w: 25 },
        { header: 'Date',         w: 30 },
        { header: 'Status',       w: 26 },
      ];

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

      const rows = studentPayments.map(p => [
        p.receiptNo  ?? '',
        p.moduleName ?? '',
        `LKR ${p.amount.toLocaleString()}`,
        p.method ? p.method.charAt(0).toUpperCase() + p.method.slice(1) : '',
        p.paidDate ?? '',
        p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : '',
      ]);

      let y = tableY + headerH;

      rows.forEach((row, rowIdx) => {
        if (y + rowH > H - 30) {
          pdf.addPage();
          y = 16;
          drawTableHeader(y);
          y += headerH;
        }

        pdf.setFillColor(rowIdx % 2 === 0 ? 255 : 240, rowIdx % 2 === 0 ? 255 : 250, rowIdx % 2 === 0 ? 255 : 254);
        pdf.rect(margin, y, usableW, rowH, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);

        const rawStatus = studentPayments[rowIdx]?.status ?? '';
        let cx = margin;
        row.forEach((cell, colIdx) => {
          const colW = cols[colIdx].w;
          if (colIdx === 5) {
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

        pdf.setDrawColor(224, 224, 224);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y + rowH, margin + usableW, y + rowH);
        y += rowH;
      });

      const totalBoxY = y + 6;
      pdf.setFillColor(0, 174, 219);
      pdf.roundedRect(margin, totalBoxY, usableW, 18, 4, 4, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(210, 240, 255);
      pdf.text('GRAND TOTAL', margin + 8, totalBoxY + 7);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`LKR ${total.toLocaleString()}`, W - margin - 8, totalBoxY + 12, { align: 'right' });

      pdf.setFillColor(0, 174, 219);
      pdf.rect(0, H - 12, W, 12, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Techna', W / 2, H - 6, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(210, 240, 255);
      pdf.text('Generated by Techna · Thank you for your payment!', W / 2, H - 1.5, { align: 'center' });

      pdf.save(`receipts-${studentCode}-${dateStr}.pdf`);
      toast.success('Combined receipt downloaded!');
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
        console.warn('Logo not found — generating combined receipt without logo.');
        drawPDF();
      });
  };

  const generateAllPDF = () => {
    if (filtered.length === 0) { toast.error('No records to export'); return; }

    const drawPDF = (logoDataUrl?: string) => {
      const pdf    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W      = pdf.internal.pageSize.getWidth();
      const H      = pdf.internal.pageSize.getHeight();
      const margin  = 12;
      const usableW = W - margin * 2;
      const dateStr = new Date().toISOString().split('T')[0];

      pdf.setFillColor(0, 174, 219);
      pdf.rect(0, 0, W, 8, 'F');

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 8, W, 52, 'F');

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

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.setTextColor(0, 174, 219);
      pdf.text('TECHNA', W / 2, 30, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Email: sivasakthy22@gmail.com  |  Contact: +94 77 170 3549', W / 2, 40, { align: 'center' });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(0, 174, 219);
      pdf.text('PAYMENT REPORT', W / 2, 51, { align: 'center' });

      pdf.setDrawColor(0, 174, 219);
      pdf.setLineWidth(0.6);
      pdf.line(margin, 62, W - margin, 62);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated: ${dateStr}  |  Total Records: ${filtered.length}`, W / 2, 68, { align: 'center' });

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

      const tableY  = boxY + boxH + 8;
      const rowH    = 8;
      const headerH = 10;

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

        pdf.setDrawColor(224, 224, 224);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y + rowH, margin + usableW, y + rowH);
        y += rowH;
      });

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
      <div className="mb-4 flex flex-wrap items-start gap-2 sm:mb-5 sm:gap-3 xl:flex-nowrap">
        <div className="relative w-full flex-none xl:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student name or receipt no…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:rounded-xl sm:text-sm" />
        </div>
        <details className="w-full sm:hidden">
          <summary className="flex h-10 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500">
            <Filter className="h-4 w-4" />
          </summary>
          <div className="mt-2 grid w-full min-w-0 gap-2 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <CompactSelect
              value={filterBatch}
              onChange={setFilterBatch}
              options={BATCHES.map(b => ({ value: b, label: b || 'All Batches' }))}
            />
            <CompactSelect
              value={filterModule}
              onChange={setFilterModule}
              options={[
                { value: '', label: 'All Modules' },
                ...allModules.map(m => ({ value: m.id, label: m.name })),
              ]}
            />
            <CompactSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: '', label: 'All Status' },
                { value: 'paid', label: 'Paid' },
                { value: 'pending', label: 'Pending' },
                { value: 'overdue', label: 'Overdue' },
              ]}
            />
            <CompactSelect
              value={String(trackingYear)}
              onChange={value => setTrackingYear(Number(value))}
              options={[2024, 2025, 2026, 2027].map(y => ({
                value: String(y),
                label: String(y),
              }))}
            />
          </div>
        </details>
        <div className="hidden w-full flex-wrap items-center gap-2 sm:flex xl:w-auto xl:flex-nowrap">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <CompactSelect
            value={filterBatch}
            onChange={setFilterBatch}
            className="w-full sm:w-40"
            options={BATCHES.map(b => ({ value: b, label: b || 'All Batches' }))}
          />
          <CompactSelect
            value={filterModule}
            onChange={setFilterModule}
            className="w-full sm:w-48 xl:w-56"
            options={[
              { value: '', label: 'All Modules' },
              ...allModules.map(m => ({ value: m.id, label: m.name })),
            ]}
          />
          <CompactSelect
            value={filterStatus}
            onChange={setFilterStatus}
            className="w-full sm:w-36"
            options={[
              { value: '', label: 'All Status' },
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          <CompactSelect
            value={String(trackingYear)}
            onChange={value => setTrackingYear(Number(value))}
            className="w-full sm:w-24"
            options={[2024, 2025, 2026, 2027].map(y => ({
              value: String(y),
              label: String(y),
            }))}
          />
        </div>
      </div>

     
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
            onDownloadAllSlips={generateStudentAllSlip}
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
                  onDownloadAllSlips={generateStudentAllSlip}
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
          batches={BATCHES}
          onClose={() => setShowAddModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      
      {editPayment && (
        <PaymentModal
          batches={BATCHES}
          initialData={editPayment}
          onClose={() => setEditPayment(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
