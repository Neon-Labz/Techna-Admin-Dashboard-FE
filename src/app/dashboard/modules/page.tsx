'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Edit2, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/common/Toast';

import type { ApiModule, ApiTeacher, CreateModuleDto, UpdateModuleDto } from '@/lib/api';
import {
  createModule,
  deleteModule,
  getModuleById,
  getModules,
  getTeachers,
  isAxiosError,
  updateModule,
} from '@/lib/api';
import { validateModuleForm } from '@/lib/validation';
import DeleteModal from '@/components/common/DeleteModal';
import Modal from '@/components/ui/Modal';

// ─── Constants ─────────────────────────────────────────────────────────────────

const BATCHES = [
  'May 2024 Batch',
  'September 2024 Batch',
  'January 2025 Batch',
  'May 2025 Batch',
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  duration: string;
  fee: string;
  batch: string;
  status: 'active' | 'inactive';
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  subject: '',
  teacherId: '',
  teacherName: '',
  duration: '',
  fee: '',
  batch: BATCHES[0],
  status: 'active',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const capitalizeWords = (str: string) =>
  str.trim().split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg) && msg.length > 0) return msg[0] as string;
  }
  return 'Something went wrong';
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200" />
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-full bg-gray-200 rounded mb-4" />
      <div className="space-y-2">
        <div className="h-3 w-2/3 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
        <div className="h-3 w-3/5 bg-gray-200 rounded" />
        <div className="h-3 w-2/5 bg-gray-200 rounded" />
      </div>
      <div className="flex gap-2 mt-4">
        <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
        <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ModulesPage() {
  const { toasts, addToast, removeToast } = useToast();
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [teachers, setTeachers] = useState<ApiTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Data fetching ──

  const fetchModules = useCallback(async () => {
    const data = await getModules();
    setModules(data);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchModules(),
          getTeachers().then(setTeachers),
        ]);
      } catch (err) {
        addToast(extractErrorMessage(err), 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchModules]);

  // ── Modal open/close ──

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    setEditId(id);
    setForm(EMPTY_FORM);
    setModalOpen(true);
    setFormLoading(true);
    try {
      const mod = await getModuleById(id);
      const teacher = teachers.find((t) => t._id === mod.teacherId);
      const teacherSubject = teacher?.subject;
      const subjectStr = Array.isArray(teacherSubject) ? teacherSubject.join(', ') : (teacherSubject ?? '');
      setForm({
        name: mod.name,
        description: mod.description,
        subject: subjectStr,
        teacherId: mod.teacherId,
        teacherName: mod.teacherName,
        duration: mod.duration,
        fee: String(mod.fee),
        batch: mod.batch,
        status: mod.status,
      });
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
      setModalOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  // ── Form handlers ──

  const handleTeacherChange = (teacherId: string) => {
    const teacher = teachers.find((t) => t._id === teacherId);
    const teacherSubject = teacher?.subject;
    const subjectStr = Array.isArray(teacherSubject) ? teacherSubject.join(', ') : (teacherSubject ?? '');
    setForm((f) => ({
      ...f,
      teacherId,
      teacherName: teacher?.fullName ?? '',
      subject: subjectStr,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateModuleForm({
      name: form.name,
      description: form.description,
    });
    if (validationError) {
      addToast(validationError, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const base: CreateModuleDto = {
        name: capitalizeWords(form.name),
        teacherId: form.teacherId,
        teacherName: form.teacherName,
        description: form.description.trim(),
        duration: form.duration.trim(),
        fee: Number(form.fee),
        batch: form.batch,
        status: form.status,
      };

      if (editId) {
        const patch: UpdateModuleDto = { ...base };
        await updateModule(editId, patch);
        addToast('Module updated!', 'success');
      } else {
        await createModule(base);
        addToast('Module created!', 'success');
      }
      closeModal();
      await fetchModules();
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteModule(deleteId);
      setModules((prev) => prev.filter((m) => m._id !== deleteId));
      addToast('Module deleted', 'success');
      setDeleteId(null);
    } catch (err) {
      addToast(extractErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtered list ──

  const filtered = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      m.batch.toLowerCase().includes(search.toLowerCase()),
  );

  const moduleToDelete = modules.find((m) => m._id === deleteId);

  // ── Render ──

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Modules</h1>
          <p className="text-gray-500 text-sm">
            {loading ? '…' : `${modules.length} total modules`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Module
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
        />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          filtered.map((mod) => (
            <div key={mod._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    mod.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {mod.status}
                </span>
              </div>

              <h3 className="font-bold text-gray-800 text-lg">{mod.name}</h3>
              <p className="text-sm text-gray-500 mt-1 mb-3 line-clamp-2">{mod.description}</p>

              <div className="space-y-1.5 text-sm text-gray-600">
                <p>👨‍🏫 {mod.teacherName}</p>
                <p>📅 {mod.batch}</p>
                <p>⏱ {mod.duration}</p>
                <p>💰 LKR {mod.fee.toLocaleString()}</p>
                <p>📎 {(mod.resources ?? []).length} resources</p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openEdit(mod._id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => setDeleteId(mod._id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? 'No modules match your search' : 'No modules yet'}</p>
          {!search && (
            <button
              onClick={openAdd}
              className="mt-3 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Module
            </button>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editId ? 'Edit Module' : 'Create New Module'}
        size="xl"
        height="content"
      >
        {formLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Module Name — full width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Module Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* 2. Description — full width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* 3. Duration (left) + Fee (right) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (e.g. 6 months)</label>
              <input
                type="text"
                required
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fee (LKR)</label>
              <input
                type="number"
                required
                min={0}
                value={form.fee}
                onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* 4. Teacher (left) + Batch (right) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
              <select
                required
                value={form.teacherId}
                onChange={(e) => handleTeacherChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Select teacher...</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>{t.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                required
                value={form.batch}
                onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {BATCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* 5. Status — left column only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                required
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Buttons — full width */}
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editId ? 'Update' : 'Create'} Module
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirmation */}
      <DeleteModal
        open={!!deleteId}
        title="Delete Module"
        itemName={moduleToDelete?.name}
        message="This will permanently delete the module and cannot be undone."
        loading={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
