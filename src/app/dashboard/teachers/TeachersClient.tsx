'use client';

import { useState, useEffect, useRef } from 'react';
import type { Teacher } from '@/types';
import {
  teacherApi,
  type CreateTeacherPayload,
  type TeacherFromApi,
} from '@/api/teacher.api';
import { getModules, type ApiModule } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import {
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
  Phone,
  Mail,
  Search,
  Loader2,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

type TeacherForm = Omit<Teacher, 'id' | 'subject'> & {
  subject: string[];
};

const emptyTeacher: TeacherForm = {
  name: '',
  email: '',
  phone: '',
  subject: [],
  qualification: '',
  experience: '',
  address: '',
  joinDate: '',
  status: 'active',
};

function normalizeSubject(subject: TeacherFromApi['subject'] | string[]): string[] {
  if (Array.isArray(subject)) return subject;

  return subject
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatSubjects(subjects: string[]): string {
  return subjects.join(', ');
}

function mapApiTeacher(t: TeacherFromApi): Teacher {
  return {
    id: t._id,
    name: t.fullName,
    email: t.email,
    phone: t.phone,
    subject: normalizeSubject(t.subject),
    qualification: t.qualification,
    experience: t.experience,
    address: t.address,
    joinDate: t.joinDate,
    status: t.status,
  };
}

function mapFormToPayload(form: TeacherForm): CreateTeacherPayload {
  return {
    fullName: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    subject: form.subject,
    qualification: form.qualification.trim(),
    experience: form.experience.trim(),
    address: form.address.trim(),
    joinDate: form.joinDate,
    status: form.status,
  };
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [backendModules, setBackendModules] = useState<ApiModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyTeacher);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');

  const subjectDropdownRef = useRef<HTMLDivElement>(null);

  const uniqueModuleNames = Array.from(
    new Map(
      backendModules
        .map((m) => (m.name || '').trim())
        .filter(Boolean)
        .map((name) => [name.toLowerCase(), name]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

  const filteredModuleNames = uniqueModuleNames.filter((name) =>
    name.toLowerCase().includes(subjectSearch.toLowerCase()),
  );

  useEffect(() => {
    fetchTeachers();
    fetchModules();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        subjectDropdownRef.current &&
        !subjectDropdownRef.current.contains(e.target as Node)
      ) {
        setSubjectDropdownOpen(false);
      }
    };

    if (subjectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [subjectDropdownOpen]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data = await teacherApi.getAll();
      setTeachers(data.map(mapApiTeacher));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const data = await getModules();
      console.log('MODULES:', data);
      setBackendModules(data);
    } catch (error) {
      console.error('Failed to load modules:', error);
      toast.error('Failed to load modules');
    }
  };

  const filtered = teachers.filter((t) => {
    const term = search.toLowerCase();

    return (
      (t.name || '').toLowerCase().includes(term) ||
      (t.email || '').toLowerCase().includes(term) ||
      formatSubjects(t.subject).toLowerCase().includes(term)
    );
  });

  const teacherToDelete = teachers.find((t) => t.id === deleteConfirm);

  const openAdd = () => {
    setForm(emptyTeacher);
    setEditTeacher(null);
    setSubjectDropdownOpen(false);
    setSubjectSearch('');
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setForm({
      name: t.name,
      email: t.email,
      phone: t.phone,
      subject: t.subject,
      qualification: t.qualification,
      experience: t.experience,
      address: t.address,
      joinDate: t.joinDate,
      status: t.status,
    });
    setEditTeacher(t);
    setSubjectDropdownOpen(false);
    setSubjectSearch('');
    setModalOpen(true);
  };

  const toggleSubject = (subject: string) => {
    setForm((prev) => {
      const selected = prev.subject.includes(subject);

      if (selected) {
        return {
          ...prev,
          subject: prev.subject.filter((s) => s !== subject),
        };
      }

      if (prev.subject.length >= 6) {
        toast.error('Maximum 6 subjects can be selected');
        return prev;
      }

      return {
        ...prev,
        subject: [...prev.subject, subject],
      };
    });
  };

  const removeSubject = (subject: string) => {
    setForm((prev) => ({
      ...prev,
      subject: prev.subject.filter((s) => s !== subject),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.subject.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    try {
      setSaving(true);
      const payload = mapFormToPayload(form);

      if (editTeacher) {
        await teacherApi.update(editTeacher.id, payload);
        toast.success('Teacher updated!');
      } else {
        await teacherApi.create(payload);
        toast.success('Teacher added!');
      }

      setModalOpen(false);
      await fetchTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      await teacherApi.delete(id);
      setDeleteConfirm(null);
      toast.success('Teacher deleted');
      await fetchTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete teacher');
    } finally {
      setDeleting(false);
    }
  };

  const preventEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const inp = (
    field: keyof Omit<TeacherForm, 'subject'>,
    label: string,
    type = 'text',
    opts?: string[],
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {opts ? (
        <select
          value={form[field] as string}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
        >
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={form[field] as string}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          required
          className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
        />
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teachers</h1>
          <p className="text-gray-500 text-sm">{teachers.length} total teachers</p>
        </div>

        <button
          onClick={openAdd}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Add Teacher
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teachers..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                    <span className="text-indigo-600 font-bold text-lg">
                      {t.name.charAt(0)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-gray-800">{t.name}</h3>
                    <p className="break-words text-sm font-medium text-indigo-600">
                      {formatSubjects(t.subject)}
                    </p>
                  </div>
                </div>

                <span
                  className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex min-w-0 items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="min-w-0 break-words">{t.email}</span>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="min-w-0 break-words">{t.phone}</span>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="min-w-0 break-words">
                    {t.qualification} · {t.experience}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
                <button
                  onClick={() => openEdit(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>

                <button
                  onClick={() => setDeleteConfirm(t.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No teachers found</p>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTeacher ? 'Edit Teacher' : 'Add New Teacher'}
        closeOnBackdrop={false}
      >
        <form
          onSubmit={handleSubmit}
          onKeyDown={preventEnterSubmit}
          className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 md:grid-cols-2"
        >
          {inp('name', 'Full Name')}
          {inp('email', 'Email', 'email')}
          {inp('phone', 'Phone')}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subjects{' '}
              <span className="text-gray-400 font-normal">
                (Select from modules, max 6)
              </span>
            </label>

            <div className="relative" ref={subjectDropdownRef}>
              <button
                type="button"
                onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-left flex items-center justify-between bg-white"
              >
                <span
                  className={
                    form.subject.length === 0 ? 'text-gray-400' : 'text-gray-700'
                  }
                >
                  {form.subject.length === 0
                    ? 'Select subjects from modules...'
                    : `${form.subject.length} subject${
                        form.subject.length > 1 ? 's' : ''
                      } selected`}
                </span>

                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    subjectDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {subjectDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        placeholder="Search modules..."
                        autoFocus
                        className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto py-1">
                    {filteredModuleNames.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-gray-400 text-center">
                        {uniqueModuleNames.length === 0
                          ? 'No modules available'
                          : 'No matching modules'}
                      </p>
                    ) : (
                      filteredModuleNames.map((moduleName) => {
                        const isSelected = form.subject.includes(moduleName);
                        const isDisabled = !isSelected && form.subject.length >= 6;

                        return (
                          <button
                            key={moduleName}
                            type="button"
                            onClick={() => toggleSubject(moduleName)}
                            disabled={isDisabled}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                : isDisabled
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-600'
                                  : isDisabled
                                    ? 'border-gray-200'
                                    : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </span>

                            <span className="text-left flex-1">{moduleName}</span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
                    <span className="text-xs text-gray-500">
                      {form.subject.length} / 6 selected
                    </span>

                    <button
                      type="button"
                      onClick={() => setSubjectDropdownOpen(false)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {form.subject.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.subject.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium"
                  >
                    {s}

                    <button
                      type="button"
                      onClick={() => removeSubject(s)}
                      className="hover:text-indigo-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {inp('qualification', 'Qualification')}
          {inp('experience', 'Experience (e.g. 5 years)')}
          {inp('address', 'Address')}
          {inp('joinDate', 'Join Date', 'date')}
          {inp('status', 'Status', 'text', ['active', 'inactive'])}

          <div className="sticky bottom-0 -mx-3.5 flex gap-3 border-t border-gray-100 bg-white px-3.5 py-3 md:col-span-2 md:-mx-5 md:px-5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editTeacher ? 'Update Teacher' : 'Add Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Teacher"
        size="sm"
        height="content"
      >
        <div className="flex flex-col items-center px-1 pb-1 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>

          <h4 className="text-base font-semibold text-gray-900">
            Remove {teacherToDelete?.name || 'this teacher'}?
          </h4>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            This will permanently delete the teacher profile and cannot be undone.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => setDeleteConfirm(null)}
            disabled={deleting}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            disabled={deleting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
