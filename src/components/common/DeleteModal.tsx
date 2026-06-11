'use client';
import { Loader2, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface DeleteModalProps {
  open: boolean;
  message: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({
  open,
  message,
  loading = false,
  onCancel,
  onConfirm,
}: DeleteModalProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} title="Confirm Delete" size="sm">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <div className="flex gap-3 mt-5">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Delete
        </button>
      </div>
    </Modal>
  );
}
