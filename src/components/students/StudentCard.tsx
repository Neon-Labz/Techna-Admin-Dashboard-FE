import { Student } from '../../types';
import { Eye, Edit2, Trash2, CheckCircle, Clock } from 'lucide-react';

interface Props {
  student: Student;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
}

export default function StudentCard({ student, onView, onEdit, onDelete, onApprove }: Props) {
  const statusColors: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {student.avatar ? (
            <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {student.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{student.name}</h3>
            <p className="text-xs text-indigo-600 font-mono font-medium">{student.studentId}</p>
            <p className="text-xs text-gray-500">{student.batch}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[student.status]}`}>
          {student.status}
        </span>
      </div>

      <div className="text-xs text-gray-500 space-y-1 mb-4">
        <p>📧 {student.email}</p>
        <p>📞 {student.phone}</p>
        <p>📚 {student.modules.length} module{student.modules.length !== 1 ? 's' : ''} enrolled</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={onView} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors">
          <Eye className="w-3 h-3" /> View & QR
        </button>

        {student.status === 'pending' && (
          <button onClick={onApprove} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors">
            <CheckCircle className="w-3 h-3" /> Approve
          </button>
        )}

        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
        <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors">
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>

      {student.status === 'pending' && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
          <Clock className="w-3 h-3" /> Awaiting approval
        </div>
      )}
    </div>
  );
}
