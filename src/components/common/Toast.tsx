"use client";
import { useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

export type ToastType = "success" | "error";
export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}
interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}
function ToastItem({ toast, onRemove }: {
  toast: ToastMessage
  onRemove: (id: number) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);
  const styles = toast.type === "success"
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : "bg-red-50 border-red-200 text-red-800";
  return (
    <div className={`flex items-center gap-3 px-4 py-3
      rounded-xl border shadow-md text-sm font-medium
      min-w-[260px] max-w-xs ${styles}`}>
      {toast.type === "success"
        ? <CheckCircle size={16} className="shrink-0 text-emerald-500" />
        : <XCircle size={16} className="shrink-0 text-red-500" />}
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 opacity-50 hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}
export default function Toast({ toasts, onRemove }: ToastProps) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
