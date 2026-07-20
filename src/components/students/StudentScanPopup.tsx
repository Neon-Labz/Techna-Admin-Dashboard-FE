"use client";
import { useState, useEffect,useRef  } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Student, PaymentRecord } from "../../types";
import { useDataStore } from "../../store/dataStore";
import { formatStudentId } from "../../utils/studentId";
import { attendanceApi } from "@/api/attendance.api";
import { paymentApi } from "@/api/payment.api";
import {
  X,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Plus,
  Edit2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  student: Student;
  onClose: () => void;
  onPaymentAdd: (p: Omit<PaymentRecord, "id">) => void;
  onPaymentUpdate: (paymentId: string, data: Partial<PaymentRecord>) => void;
  onAttendanceUpdate: (
    moduleId: string,
    date: string,
    status: "present" | "absent",
  ) => void;
}

type PayForm = {
  moduleId: string;
  amount: string;
  method: "cash" | "bank" | "online";
  paidDate: string;
  status: "paid" | "pending" | "overdue";
};

const emptyForm: PayForm = {
  moduleId: "",
  amount: "",
  method: "cash",
  paidDate: new Date().toISOString().split("T")[0],
  status: "paid",
};

export default function StudentScanPopup({
  student,
  onClose,
  onPaymentAdd,
  onPaymentUpdate,
  onAttendanceUpdate,
}: Props) {
  const { modules } = useDataStore();
  const today = new Date().toISOString().split("T")[0];

  const normalizeForMatch = (value: string = "") =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\band\b/g, "")
    .replace(/technology/g, "technology")
    .replace(/[^a-z0-9]/g, "")
    .trim();

  const studentModules = (() => {
    const s = student as any;
    const values: string[] =
      Array.isArray(s.subjects) && s.subjects.length > 0 ? s.subjects
      : Array.isArray(s.modules) && s.modules.length > 0 ? s.modules
      : Array.isArray(s.subjectSelection?.subjects) && s.subjectSelection.subjects.length > 0 ? s.subjectSelection.subjects
      : [];
    return values.map((item: string) => {
      const normItem = normalizeForMatch(item);
      return modules.find((m) =>
        m.id === item || m.name === item || normalizeForMatch(m.name) === normItem
      ) || { id: item, name: item, fee: 0, teacherName: '' };
    });
  })();

  const [payModal, setPayModal] = useState<{
    mode: "add" | "edit";
    payment?: PaymentRecord;
  } | null>(null);
  const [payForm, setPayForm] = useState<PayForm>(emptyForm);
  const [localAttendance, setLocalAttendance] = useState<any[]>(student.attendance || []);
  const [localPayments, setLocalPayments] = useState<any[]>(student.payments || []);

  useEffect(() => {
    const sid = student.studentId;
    const mid = student.id;
    attendanceApi.getByStudent(sid).then(setLocalAttendance).catch(() => {});
    Promise.all([
      paymentApi.getByStudent(sid).catch(() => [] as any[]),
      mid && mid !== sid ? paymentApi.getByStudent(mid).catch(() => [] as any[]) : Promise.resolve([] as any[]),
    ]).then(([a, b]) => {
      const seen = new Set<string>();
      setLocalPayments([...a, ...b].filter((p: any) => {
        const key = p.id || p._id || `${p.moduleId}-${p.paidDate}-${p.amount}`;
        return seen.has(key) ? false : (seen.add(key), true);
      }));
    }).catch(() => {});
  }, [student.studentId, student.id]);

  const qrValue = JSON.stringify({
    qrToken: student.qrToken,
    studentId: student.studentId,
  });

  const getAttStatus = (moduleId: string) =>
    localAttendance.find((a: any) => a.moduleId === moduleId && (a.date === today || String(a.date).startsWith(today)))
      ?.status ?? null;

  const getLatestPayment = (moduleId: string, moduleName: string) => {
  const normalizedModuleName = normalizeForMatch(moduleName);

  return [...localPayments]
    .filter((payment: any) => {
      const paymentModuleName = normalizeForMatch(
        payment.moduleName || payment.subjectName || "",
      );

      return (
        payment.moduleId === moduleId ||
        payment.module === moduleId ||
        paymentModuleName === normalizedModuleName ||
        paymentModuleName.includes(normalizedModuleName) ||
        normalizedModuleName.includes(paymentModuleName)
      );
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.paidDate || a.date || a.createdAt).getTime();
      const dateB = new Date(b.paidDate || b.date || b.createdAt).getTime();

      return dateB - dateA;
    })[0];
};
const isModulePaidForMonth = (
  moduleId: string,
  moduleName: string,
  selectedDate: string,
) => {
  if (!selectedDate) return false;

  const selected = new Date(`${selectedDate}T00:00:00`);
  const selectedMonth = selected.getMonth();
  const selectedYear = selected.getFullYear();
  const normalizedModuleName = normalizeForMatch(moduleName);

  return localPayments.some((payment: any) => {
    if (payment.status?.toLowerCase() !== "paid") {
      return false;
    }

    const paymentDateValue =
      payment.paidDate || payment.date || payment.createdAt;

    if (!paymentDateValue) return false;

    const paymentDate = new Date(paymentDateValue);

    if (Number.isNaN(paymentDate.getTime())) {
      return false;
    }

    const paymentModuleName = normalizeForMatch(
      payment.moduleName || payment.subjectName || "",
    );

    const sameModule =
      payment.moduleId === moduleId ||
      payment.module === moduleId ||
      paymentModuleName === normalizedModuleName;

    const sameMonth =
      paymentDate.getMonth() === selectedMonth &&
      paymentDate.getFullYear() === selectedYear;

    return sameModule && sameMonth;
  });
};

  const pendingPayments = localPayments.filter((p: any) => p.status !== "paid");

  const openAdd = () => {
    setPayForm(emptyForm);
    setPayModal({ mode: "add" });
  };

  const openEdit = (p: PaymentRecord) => {
    
    setPayForm({
      moduleId: p.moduleId ?? "",
      amount: String(p.amount),
      method: p.method,
      paidDate: p.paidDate,
      status: p.status,
    });
    setPayModal({ mode: "edit", payment: p });
  };

const [isSaving, setIsSaving] = useState(false);
const submitLockRef = useRef(false);

const handlePaySubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (isSaving) return;

  const mod = studentModules.find(
    (m) => m.id === payForm.moduleId
  );

  if (!mod) {
    toast.error("Please select a valid module");
    return;
  }

  const alreadyPaid = isModulePaidForMonth(
    mod.id,
    mod.name,
    payForm.paidDate,
  );

  if (alreadyPaid && payModal?.mode !== "edit") {
    toast.error("This module is already paid for this month.");
    return;
  }

  setIsSaving(true);

  try {
    if (payModal?.mode === "edit" && payModal.payment) {
      onPaymentUpdate(payModal.payment.id, {
        moduleId: payForm.moduleId,
        moduleName: mod.name,
        amount: Number(payForm.amount),
        method: payForm.method,
        paidDate: payForm.paidDate,
        status: payForm.status,
      });

      toast.success("Payment updated!");
    } else {
      const receiptNo = `REC-${Date.now()}`;

      const saved = await paymentApi.create({
        studentId: student.studentId || student.id,
        studentName: student.name,
        moduleId: payForm.moduleId,
        moduleName: mod.name,
        amount: Number(payForm.amount),
        paidDate: payForm.paidDate,
        method: payForm.method,
        status: payForm.status,
        receiptNo,
        batch: student.batch,
      });

      setLocalPayments((prev) => {
        const savedId = saved.id ;

        const alreadyExists = prev.some(
          (payment: any) =>
            (payment.id || payment._id) === savedId
        );

        return alreadyExists ? prev : [...prev, saved];
      });

      toast.success("Payment recorded!");
    }

    setPayModal(null);
  } catch (error) {
    console.error("Payment save failed:", error);
    toast.error("Payment save failed");
  } finally {
    setIsSaving(false);
  }
};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* ── Header: Profile Info ── */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-6 text-white flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-5">
            {/* Avatar */}
            {student.avatar ? (
              <img
                src={student.avatar}
                alt={student.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 border-2 border-white/30">
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{student.name}</h2>
              <p className="text-indigo-200 font-mono text-sm mt-0.5">
                {formatStudentId(student.studentId)}
              </p>
              <p className="text-indigo-200 text-xs mt-0.5">{student.batch}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-indigo-100">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {student.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {student.phone}
                </span>
              </div>
              <span
                className={`inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full font-semibold ${student.status === "approved" ? "bg-emerald-400/30 text-emerald-100" : student.status === "pending" ? "bg-amber-400/30 text-amber-100" : "bg-red-400/30 text-red-100"}`}
              >
                {student.status.toUpperCase()}
              </span>
            </div>
            {/* QR Code */}
            <div className="flex-shrink-0 bg-white p-2 rounded-xl">
              <QRCodeSVG value={qrValue} size={80} level="M" />
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* ── Attendance ── */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-gray-800">
                Attendance — Today ({today})
              </h3>
            </div>
            {studentModules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">
                Not enrolled in any modules
              </p>
            ) : (
              <div className="space-y-2">
                {studentModules.map((m) => {
                  const status = getAttStatus(m.id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {m.name}
                        </p>
                        <p className="text-xs text-gray-400">{m.teacherName}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onAttendanceUpdate(m.id, today, "present");
                            setLocalAttendance(prev => [
                              ...prev.filter((a: any) => !(a.moduleId === m.id && String(a.date).startsWith(today))),
                              { moduleId: m.id, date: today, status: 'present' },
                            ]);
                            attendanceApi.markAttendance({ studentId: student.studentId, moduleId: m.id, moduleName: m.name, date: today, status: 'present' }).catch(() => {});
                            toast.success(`${m.name}: Present`);
                          }}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${status === "present" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700"}`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Present
                        </button>
                        <button
                          onClick={() => {
                            onAttendanceUpdate(m.id, today, "absent");
                            setLocalAttendance(prev => [
                              ...prev.filter((a: any) => !(a.moduleId === m.id && String(a.date).startsWith(today))),
                              { moduleId: m.id, date: today, status: 'absent' },
                            ]);
                            attendanceApi.markAttendance({ studentId: student.studentId, moduleId: m.id, moduleName: m.name, date: today, status: 'absent' }).catch(() => {});
                            toast.success(`${m.name}: Absent`);
                          }}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${status === "absent" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600"}`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Payments ── */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                <h3 className="font-semibold text-gray-800">Payments</h3>
                {pendingPayments.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {pendingPayments.length}{" "}
                    pending
                  </span>
                )}
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Payment
              </button>
            </div>

            {/* Per-module payment status */}
            <div className="space-y-2 mb-4">
              {studentModules.map((m) => {
                const latest = getLatestPayment(m.id, m.name);
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border ${latest?.status === "paid" ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {m.name}
                      </p>
                      
                    </div>
                    {latest ? (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p
                            className={`text-xs font-semibold ${latest.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}
                          >
                            LKR {latest.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">
                            {latest.status.toUpperCase()} · {latest.method}
                          </p>
                        </div>
                        
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Unpaid
                      </span>
                    )}
                  </div>
                );

              })}
            </div>

            {/* Pending payments highlight */}
            {pendingPayments.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Pending / Overdue
                </p>
                <div className="space-y-1.5">
                  {pendingPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs px-3 py-2 bg-amber-50 rounded-lg border border-amber-100"
                    >
                      <span className="font-medium text-gray-700">
                        {p.moduleName}
                      </span>
                      <span className="text-gray-500">{p.paidDate}</span>
                      <span className="font-semibold text-amber-700">
                        LKR {p.amount.toLocaleString()}
                      </span>
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full font-medium ${p.status === "overdue" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1 rounded hover:bg-amber-100"
                      >
                        <Edit2 className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {localPayments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">
                No payment records yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Add / Edit Payment Modal ── */}
      {payModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPayModal(null)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-800 mb-4">
              {payModal.mode === "edit" ? "Edit Payment" : "Add Payment"}
            </h3>
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
                  <option value="">Select module…</option>
                  {studentModules.map((m) => {
                    const alreadyPaid = isModulePaidForMonth(
                      m.id,
                      m.name,
                      payForm.paidDate,
                    );

                    return (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={alreadyPaid}
                      >
                        {m.name} — LKR {m.fee.toLocaleString()}
                        {alreadyPaid ? " (Already Paid)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (LKR)
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method
                  </label>
                  <select
                    value={payForm.method}
                    onChange={(e) =>
                      setPayForm((f) => ({
                        ...f,
                        method: e.target.value as PayForm["method"],
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={payForm.status}
                    onChange={(e) =>
                      setPayForm((f) => ({
                        ...f,
                        status: e.target.value as PayForm["status"],
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="paid">PAID</option>
                    <option value="pending">PENDING</option>
                    <option value="overdue">OVERDUE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={payForm.paidDate}
                  onChange={(e) =>
                    setPayForm((f) => ({ ...f, paidDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPayModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
  type="submit"
  disabled={isSaving}
  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSaving
    ? "Saving..."
    : payModal.mode === "edit"
      ? "Update Payment"
      : "Record Payment"}
</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}