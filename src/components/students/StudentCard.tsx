'use client';

import { useState } from 'react';
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

  return (
    <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
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

          <div>
            <h3 className="font-semibold text-gray-800 text-sm">
              {student.name}
            </h3>

            <p className="text-xs text-indigo-600 font-medium">
              {student.studentId}
            </p>

            <p className="text-xs text-gray-500">{student.batch}</p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold ${currentStatus.badge}`}
          >
            {currentStatus.label}
            <ChevronDown className="w-3 h-3" />
          </button>

          {isStatusOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
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

      <div className="text-xs text-gray-500 space-y-2 mb-4">
        <p>📧 {student.email}</p>
        <p>📞 {student.phone}</p>
        <p>
          📚 {student.modules?.length || 0} module
          {(student.modules?.length || 0) !== 1 ? 's' : ''} enrolled
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onView}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors"
        >
          <Eye className="w-3 h-3" />
          View & QR
        </button>

        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>

        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors"
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