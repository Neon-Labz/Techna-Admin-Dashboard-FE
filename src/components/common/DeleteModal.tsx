'use client';
import { Loader2, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface DeleteModalProps {
  open: boolean;
  message: string;
  title?: string;
  itemName?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({
  open,
  message,
  title = 'Confirm Delete',
  itemName,
  loading = false,
  onCancel,
  onConfirm,
}: DeleteModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      title={title}
      size="sm"
      height="content"
    >
      <div className="flex flex-col items-center px-1 pb-1 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <Trash2 className="h-6 w-6 text-red-600" />
        </div>

        <h4 className="text-base font-semibold text-gray-900">
          Remove {itemName || 'this item'}?
        </h4>

        <p className="mt-2 text-sm leading-6 text-gray-500">{message}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>

        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Delete
        </button>
      </div>
    </Modal>
  );
}
