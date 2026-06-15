'use client';

import { useEffect, useRef, useState } from 'react';
import type { Teacher } from '../types';
import { teacherApi, type TeacherFromApi } from '../api/teacher.api';
import { getModules, type ApiModule } from '../lib/api';
import { useDataStore } from '../store/dataStore';
import Modal from '../components/ui/Modal';
import {
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
  Phone,
  Mail,
  Search,
  Loader2,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

const emptyTeacher: Omit<Teacher, 'id'> = {
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

function validateSriLankanPhone(phone: string): { valid: boolean; message: string } {
  const cleaned = phone.replace(/[\s-]/g, '');

  if (!cleaned) return { valid: false, message: 'Phone number is required' };

  const patterns = [/^\+94\d{9}$/, /^094\d{9}$/, /^0\d{9}$/];

  if (!patterns.some((p) => p.test(cleaned))) {
    return {
      valid: false,
      message: 'Enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)',
    };
  }

  return { valid: true, message: '' };
}

function mapApiTeacher(t: TeacherFromApi): Teacher {
  return {
    id: t._id,
    name: t.fullName,
    email: t.email,
    phone: t.phone,
    subject: Array.isArray(t.subject)
      ? t.subject
      : t.subject
        ? t.subject.split(',').map((s) => s.trim())
        : [],
    qualification: t.qualification,
    experience: t.experience,
    address: t.address,
    joinDate: t.joinDate,
    status: t.status,
  };
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function TeachersPage() {
  const { addTeacher, updateTeacher, deleteTeacher } = useDataStore();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [backendModules, setBackendModules] = useState<ApiModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<Omit<Teacher, 'id'>>(emptyTeacher);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');

  const subjectDropdownRef = useRef<HTMLDivElement>(null);

  const uniqueModuleNames = Array.from(
    new Map(
      backendModules
        .map((m) => (m.name || '').trim())
        .filter((name) => name.length > 0)
        .map((name) => [name.toLowerCase(), name]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

  const filteredModuleNames = uniqueModuleNames.filter((name) =>
    name.toLowerCase().includes(subjectSearch.toLowerCase()),
  );

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

  useEffect(() => {
    fetchTeachers();
    fetchBackendModules();
  }, []);

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

  const fetchBackendModules = async () => {
    try {
      const data = await getModules();
      setBackendModules(data);
    } catch (error) {
      console.error('Failed to load modules:', error);
    }
  };

  const filtered = teachers.filter((t) => {
    const term = search.toLowerCase();
    const subjectStr = Array.isArray(t.subject) ? t.subject.join(' ') : t.subject;

    return (
      (t.name || '').toLowerCase().includes(term) ||
      (t.email || '').toLowerCase().includes(term) ||
      subjectStr.toLowerCase().includes(term)
    );
  });

  const openAdd = () => {
    setForm(emptyTeacher);
    setEditTeacher(null);
    setErrors({});
    setSubjectDropdownOpen(false);
    setSubjectSearch('');
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setForm({ ...t });
    setEditTeacher(t);
    setErrors({});
    setSubjectDropdownOpen(false);
    setSubjectSearch('');
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Full name is required';

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailExists = teachers.some(
        (t) =>
          t.email.toLowerCase() === form.email.trim().toLowerCase() &&
          t.id !== editTeacher?.id,
      );
      if (emailExists) newErrors.email = 'This email is already used by another teacher';
    }

    const phoneValidation = validateSriLankanPhone(form.phone);
    if (!phoneValidation.valid) {
      newErrors.phone = phoneValidation.message;
    } else {
      const cleanedPhone = form.phone.replace(/[\s-]/g, '');
      const phoneExists = teachers.some(
        (t) =>
          t.phone.replace(/[\s-]/g, '') === cleanedPhone &&
          t.id !== editTeacher?.id,
      );
      if (phoneExists) newErrors.phone = 'This phone number is already used by another teacher';
    }

    if (form.subject.length === 0) newErrors.subject = 'At least one subject is required';

    if (!form.joinDate) {
      newErrors.joinDate = 'Join date is required';
    } else {
      const selected = new Date(form.joinDate);
      const today = new Date(getTodayString());
      if (selected < today) newErrors.joinDate = 'Join date cannot be in the past';
    }

    if (!form.qualification.trim()) newErrors.qualification = 'Qualification is required';
    if (!form.experience.trim()) newErrors.experience = 'Experience is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload = {
        fullName: form.name,
        email: form.email,
        phone: form.phone,
        subject: form.subject,
        qualification: form.qualification,
        experience: form.experience,
        address: form.address,
        joinDate: form.joinDate,
        status: form.status,
      };

      if (editTeacher) {
        const updated = await teacherApi.update(editTeacher.id, payload);
        const mapped = mapApiTeacher(updated);

        setTeachers((prev) =>
          prev.map((t) => (t.id === editTeacher.id ? mapped : t)),
        );
        updateTeacher(editTeacher.id, form);
        toast.success('Teacher updated successfully!');
      } else {
        const created = await teacherApi.create(payload);
        const mapped = mapApiTeacher(created);

        setTeachers((prev) => [...prev, mapped]);
        addTeacher(form);
        toast.success('Teacher added successfully!');
      }

      setModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await teacherApi.delete(id);
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      deleteTeacher(id);
      toast.success('Teacher deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete teacher');
    }

    setDeleteConfirm(null);
  };

  const toggleSubject = (subject: string) => {
    setForm((f) => {
      const isSelected = f.subject.includes(subject);

      if (isSelected) {
        return { ...f, subject: f.subject.filter((s) => s !== subject) };
      }

      if (f.subject.length >= 6) {
        toast.error('Maximum 6 subjects can be selected');
        return f;
      }

      return { ...f, subject: [...f.subject, subject] };
    });

    if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
  };

  const removeSubject = (subject: string) => {
    setForm((f) => ({
      ...f,
      subject: f.subject.filter((s) => s !== subject),
    }));
  };

  const preventEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const inp = (
    field: keyof Omit<Teacher, 'id'>,
    label: string,
    type = 'text',
    opts?: string[],
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

      {opts ? (
        <select
          value={form[field] as string}
          onChange={(e) => {
            setForm((f) => ({ ...f, [field]: e.target.value }));
            if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
            errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
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
          onChange={(e) => {
            setForm((f) => ({ ...f, [field]: e.target.value }));
            if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
          }}
          required
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
            errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
        />
      )}

      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse"
            >
              <div className="h-24 bg-gray-100 rounded-xl" />
            </div>
          ))}
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
                      {Array.isArray(t.subject) ? t.subject.join(', ') : t.subject}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => {
                setForm((f) => ({ ...f, phone: e.target.value }));
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subjects <span className="text-gray-400 font-normal">(Select from modules, max 6)</span>
            </label>

            <div className="relative" ref={subjectDropdownRef}>
              <button
                type="button"
                onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-left flex items-center justify-between bg-white ${
                  errors.subject ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <span className={form.subject.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
                  {form.subject.length === 0
                    ? 'Select subjects from modules...'
                    : `${form.subject.length} of 6 subject${
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

            {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
          </div>

          {inp('qualification', 'Qualification')}
          {inp('experience', 'Experience (e.g. 5 years)')}
          {inp('address', 'Address')}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
            <input
              type="date"
              value={form.joinDate}
              min={getTodayString()}
              onChange={(e) => {
                setForm((f) => ({ ...f, joinDate: e.target.value }));
                if (errors.joinDate) setErrors((prev) => ({ ...prev, joinDate: '' }));
              }}
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                errors.joinDate ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.joinDate && (
              <p className="text-xs text-red-500 mt-1">{errors.joinDate}</p>
            )}
          </div>

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
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editTeacher ? 'Update' : 'Add'} Teacher
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
        size="sm"
      >
        <p className="text-gray-600 text-sm mb-5">
          Are you sure you want to delete this teacher? This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}