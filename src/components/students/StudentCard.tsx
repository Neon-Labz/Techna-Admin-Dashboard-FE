'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Student } from '../../types';
import {
  Eye,
  Edit2,
  Trash2,
  Clock,
  ChevronDown,
} from 'lucide-react';

interface Props {
  student: Student;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onStatusChange?: (status: 'pending' | 'approved' | 'rejected') => void;
}

export default function StudentCard({
  student,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onStatusChange,
}: Props) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const statuses = [
    {
      value: 'approved',
      label: 'APPROVED',
      dot: 'bg-green-500',
      badge: 'bg-green-100 text-green-700',
    },
    {
      value: 'pending',
      label: 'PENDING',
      dot: 'bg-orange-500',
      badge: 'bg-orange-100 text-orange-700',
    },
    {
      value: 'rejected',
      label: 'REJECTED',
      dot: 'bg-red-500',
      badge: 'bg-red-100 text-red-700',
    },
  ] as const;

  const currentStatus =
    statuses.find((s) => s.value === student.status) || statuses[1];

  const handleStatusChange = (
    status: 'pending' | 'approved' | 'rejected',
  ) => {
    setIsStatusOpen(false);

    if (onStatusChange) {
      onStatusChange(status);
      return;
    }

    if (status === 'approved') {
      onApprove();
    }
  };

  useEffect(() => {
    setIsStatusOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isStatusOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isStatusOpen]);

  return (
    <div className="relative rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {student.avatar ? (
            <img
              src={student.avatar}
              alt={student.name}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {student.name?.charAt(0)?.toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold text-gray-800">
              {student.name}
            </h3>

            <p className="break-words text-xs font-medium text-indigo-600">
              {student.studentId}
            </p>

            <p className="break-words text-xs text-gray-500">{student.batch}</p>
          </div>
        </div>

        <div ref={statusMenuRef} className="relative self-start">
          <button
            type="button"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold sm:px-4 ${currentStatus.badge}`}
          >
            {currentStatus.label}
            <ChevronDown className="w-3 h-3" />
          </button>

          {isStatusOpen && (
            <div className="absolute left-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg sm:left-auto sm:right-0 sm:w-44">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() =>
                    handleStatusChange(
                      status.value as
                        | 'pending'
                        | 'approved'
                        | 'rejected',
                    )
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <span
                    className={`w-3 h-3 rounded-full ${status.dot}`}
                  ></span>
                  {status.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-2 break-words text-xs text-gray-500">
        <p>📧 {student.email}</p>
        <p>📞 {student.phone}</p>
        <p>
          📚 {student.modules?.length || 0} module
          {(student.modules?.length || 0) !== 1 ? 's' : ''} enrolled
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3 sm:flex sm:flex-wrap">
        <button
          onClick={onView}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
        >
          <Eye className="w-3 h-3" />
          View & QR
        </button>

        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>

        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-100"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>

      {student.status === 'pending' && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
          <Clock className="w-3 h-3" />
          Awaiting approval
        </div>
      )}
    </div>
  );
}
