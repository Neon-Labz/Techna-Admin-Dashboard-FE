'use client';
import { useState, useEffect } from 'react';
import { useDataStore } from '../store/dataStore';
import type { Teacher } from '../types';
import { teacherApi, type TeacherFromApi } from '../api/teacher.api';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── TagInput ────────────────────────────────────────────────────────────────
function TagInput({
  tags,
  onChange,
  placeholder,
  hint,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [val, setVal] = useState('');

  const add = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal('');
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-[#6B7280]"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
        >
          Add
        </button>
      </div>
      {hint && <p className="text-xs text-[#6B7280] mt-1">{hint}</p>}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function validateSriLankanPhone(phone: string): { valid: boolean; message: string } {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (!cleaned) return { valid: false, message: 'Phone number is required' };
  const patterns = [/^\+94\d{9}$/, /^094\d{9}$/, /^0\d{9}$/];
  const isValid = patterns.some(p => p.test(cleaned));
  if (!isValid) {
    return {
      valid: false,
      message: 'Enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)',
    };
  }
  return { valid: true, message: '' };
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

const emptyForm = (): Omit<Teacher, 'id'> => ({
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  subject: [],
  qualification: '',
  experience: '',
  address: '',
  joinDate: '',
  status: 'active',
  degree: [],
  specializations: [],
  awards: [],
  achievements: [],
  biography: '',
});

function mapApiTeacher(t: TeacherFromApi): Teacher {
  return {
    id: t._id,
    name: t.fullName,
    firstName: t.firstName ?? '',
    lastName: t.lastName ?? '',
    email: t.email,
    phone: t.phone,
    subject: Array.isArray(t.subject)
      ? t.subject
      : t.subject
        ? String(t.subject).split(',').map(s => s.trim())
        : [],
    qualification: t.qualification ?? '',
    experience: t.experience,
    address: t.address,
    joinDate: t.joinDate,
    status: t.status,
    photoUrl: t.photoUrl,
    degree: t.degree ?? [],
    specializations: t.specializations ?? [],
    awards: t.awards ?? [],
    achievements: t.achievements ?? [],
    biography: t.biography ?? '',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TeachersPage() {
  const { addTeacher, updateTeacher, deleteTeacher } = useDataStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<Omit<Teacher, 'id'>>(emptyForm());
  const [subjectText, setSubjectText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data = await teacherApi.getAll();
      setTeachers(data.map(mapApiTeacher));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const filtered = teachers.filter(t => {
    const term = search.toLowerCase();
    const subjectStr = Array.isArray(t.subject) ? t.subject.join(' ') : t.subject;
    return (
      (t.name || '').toLowerCase().includes(term) ||
      (t.email || '').toLowerCase().includes(term) ||
      subjectStr.toLowerCase().includes(term)
    );
  });

  const openAdd = () => {
    setForm(emptyForm());
    setSubjectText('');
    setEditTeacher(null);
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(null);
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    const firstName = t.firstName || t.name.split(' ')[0] || '';
    const lastName = t.lastName || t.name.split(' ').slice(1).join(' ') || '';
    setForm({
      ...t,
      firstName,
      lastName,
      degree: t.degree ?? [],
      specializations: t.specializations ?? [],
      awards: t.awards ?? [],
      achievements: t.achievements ?? [],
      biography: t.biography ?? '',
    });
    setSubjectText(Array.isArray(t.subject) ? t.subject.join(', ') : (t.subject ?? ''));
    setEditTeacher(t);
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview(t.photoUrl ?? null);
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.firstName?.trim()) newErrors.firstName = 'First name is required';

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailExists = teachers.some(
        t =>
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
        t => t.phone.replace(/[\s-]/g, '') === cleanedPhone && t.id !== editTeacher?.id,
      );
      if (phoneExists) newErrors.phone = 'This phone number is already used by another teacher';
    }

    if (!subjectText.trim()) newErrors.subject = 'At least one subject is required';

    if (!form.joinDate) {
      newErrors.joinDate = 'Join date is required';
    } else if (!editTeacher) {
      const selected = new Date(form.joinDate);
      const today = new Date(getTodayString());
      if (selected < today) newErrors.joinDate = 'Join date cannot be in the past';
    }

    if (!form.experience.trim()) newErrors.experience = 'Experience is required';

    if (form.biography && countWords(form.biography) > 100) {
      newErrors.biography = 'Bio must not exceed 100 words';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    const subjects = subjectText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const fullName = [form.firstName?.trim(), form.lastName?.trim()].filter(Boolean).join(' ');

    setSubmitting(true);
    try {
      let savedId: string;

      const payload = {
        fullName,
        firstName: form.firstName?.trim() ?? '',
        lastName: form.lastName?.trim() ?? '',
        email: form.email,
        phone: form.phone,
        subject: subjects,
        qualification: form.qualification ?? '',
        experience: form.experience,
        address: form.address,
        joinDate: form.joinDate,
        status: form.status,
        degree: form.degree ?? [],
        specializations: form.specializations ?? [],
        awards: form.awards ?? [],
        achievements: form.achievements ?? [],
        biography: form.biography ?? '',
      };

      if (editTeacher) {
        await teacherApi.update(editTeacher.id, payload);
        updateTeacher(editTeacher.id, { ...form, name: fullName, subject: subjects });
        savedId = editTeacher.id;
      } else {
        const created = await teacherApi.create(payload);
        addTeacher({ ...form, name: fullName, subject: subjects });
        savedId = created._id;
      }

      if (photoFile && savedId) {
        try {
          await teacherApi.uploadPhoto(savedId, photoFile);
          toast.success(editTeacher ? 'Teacher updated with photo!' : 'Teacher added with photo!');
        } catch {
          toast.success(editTeacher ? 'Teacher updated!' : 'Teacher added!');
          toast.error('Photo upload failed — teacher saved without photo');
        }
      } else {
        toast.success(
          editTeacher ? 'Teacher updated successfully!' : 'Teacher added successfully!',
        );
      }

      setModalOpen(false);
      await fetchTeachers();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await teacherApi.delete(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
      deleteTeacher(id);
      toast.success('Teacher deleted successfully');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete teacher');
    }
    setDeleteConfirm(null);
  };

  const bioWordCount = countWords(form.biography ?? '');

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teachers</h1>
          <p className="text-gray-500 text-sm">{teachers.length} total teachers</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Teacher
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teachers..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
        />
      </div>

      {/* ── Skeleton Loading ── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-200" />
                  <div>
                    <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="h-5 w-14 bg-gray-200 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
                  <div className="h-3 w-40 bg-gray-200 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
                  <div className="h-3 w-36 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
                <div className="flex-1 h-9 bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Teacher cards ── */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden">
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-indigo-600 font-bold text-lg">
                        {t.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{t.name}</h3>
                    <p className="text-sm text-indigo-600 font-medium">
                      {Array.isArray(t.subject) ? t.subject.join(', ') : t.subject}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {t.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {t.email}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {t.phone}
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                  {t.qualification} · {t.experience}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
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

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTeacher ? 'Edit Teacher' : 'Add New Teacher'}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 1 ── Profile Picture ── */}
          <div className="md:col-span-2 flex flex-col items-center gap-3 pb-5 border-b border-gray-100">
            <label htmlFor="teacher-photo-upload" className="cursor-pointer">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <span className="text-3xl text-gray-400 leading-none select-none">+</span>
                </div>
              )}
            </label>
            <div className="text-center">
              <p className="text-sm font-bold text-[#374151]">Profile Picture</p>
              <p className="text-xs text-[#6B7280] mb-3">
                Optional. Recommended 200×200px. JPG, PNG
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <label
                  htmlFor="teacher-photo-upload"
                  className="cursor-pointer px-4 py-1.5 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  style={{ background: '#2563EB', borderRadius: '12px' }}
                >
                  Upload Photo
                </label>
                <input
                  id="teacher-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="px-4 py-1.5 text-gray-600 text-xs font-medium border border-[#E5E7EB] hover:bg-gray-100 transition-colors"
                    style={{ background: '#F1F5F9', borderRadius: '12px' }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2 ── First Name | Last Name ── */}
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">First Name</label>
            <input
              type="text"
              value={form.firstName ?? ''}
              onChange={e => {
                setForm(f => ({ ...f, firstName: e.target.value }));
                if (errors.firstName) setErrors(p => ({ ...p, firstName: '' }));
              }}
              placeholder="e.g. Sarah"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-[#6B7280] ${
                errors.firstName ? 'border-red-300 bg-red-50' : 'border-[#E5E7EB]'
              }`}
            />
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Last Name</label>
            <input
              type="text"
              value={form.lastName ?? ''}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              placeholder="e.g. Chen"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-[#6B7280]"
            />
          </div>

          {/* 3 ── Email | Contact Number ── */}
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => {
                setForm(f => ({ ...f, email: e.target.value }));
                if (errors.email) setErrors(p => ({ ...p, email: '' }));
              }}
              placeholder="email@example.com"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-[#6B7280] ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-[#E5E7EB]'
              }`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Contact Number</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => {
                setForm(f => ({ ...f, phone: e.target.value }));
                if (errors.phone) setErrors(p => ({ ...p, phone: '' }));
              }}
              placeholder="e.g. 0771234567"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-[#6B7280] ${
                errors.phone ? 'border-red-300 bg-red-50' : 'border-[#E5E7EB]'
              }`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          {/* 4 ── Subject | Qualifications ── */}
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Subject</label>
            <input
              type="text"
              value={subjectText}
              onChange={e => {
                setSubjectText(e.target.value);
                if (errors.subject) setErrors(p => ({ ...p, subject: '' }));
              }}
              placeholder="e.g. ICT, Engineering Technology"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-[#6B7280] ${
                errors.subject ? 'border-red-300 bg-red-50' : 'border-[#E5E7EB]'
              }`}
            />
            {errors.subject && (
              <p className="text-xs text-red-500 mt-1">{errors.subject}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Qualifications</label>
            <input
              type="text"
              value={form.qualification ?? ''}
              onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
              placeholder="e.g. BSc in Computer Science"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-[#6B7280]"
            />
          </div>

          {/* 5 ── Address (full width) ── */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-[#374151] mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="e.g. No. 10, Main Street, Colombo"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-[#6B7280]"
            />
          </div>

          {/* 6 ── Degree | Experience ── */}
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Degree</label>
            <TagInput
              tags={form.degree ?? []}
              onChange={tags => setForm(f => ({ ...f, degree: tags }))}
              placeholder="e.g. MSc Computer Science"
              hint="Press Enter or click Add for each degree"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Experience</label>
            <input
              type="text"
              value={form.experience}
              onChange={e => {
                setForm(f => ({ ...f, experience: e.target.value }));
                if (errors.experience) setErrors(p => ({ ...p, experience: '' }));
              }}
              placeholder="e.g. 5 years"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-[#6B7280] ${
                errors.experience ? 'border-red-300 bg-red-50' : 'border-[#E5E7EB]'
              }`}
            />
            {errors.experience && (
              <p className="text-xs text-red-500 mt-1">{errors.experience}</p>
            )}
          </div>

          {/* 7 ── Area of Specialization | Status ── */}
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">
              Area of Specialization
            </label>
            <TagInput
              tags={form.specializations ?? []}
              onChange={tags => setForm(f => ({ ...f, specializations: tags }))}
              placeholder="e.g. Machine Learning"
              hint="Press Enter or click Add for each specialization"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Status</label>
            <select
              value={form.status}
              onChange={e =>
                setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))
              }
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="active">ACTIVE</option>
              <option value="inactive">INACTIVE</option>
            </select>
          </div>

          {/* Join Date (full width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-[#374151] mb-1">Join Date</label>
            <input
              type="date"
              value={form.joinDate}
              min={editTeacher ? undefined : getTodayString()}
              onChange={e => {
                setForm(f => ({ ...f, joinDate: e.target.value }));
                if (errors.joinDate) setErrors(p => ({ ...p, joinDate: '' }));
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                errors.joinDate ? 'border-red-300 bg-red-50' : 'border-[#E5E7EB]'
              }`}
            />
            {errors.joinDate && (
              <p className="text-xs text-red-500 mt-1">{errors.joinDate}</p>
            )}
          </div>

          {/* 8 ── Bio (full width) ── */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-[#374151] mb-1">Bio</label>
            <textarea
              value={form.biography ?? ''}
              onChange={e => {
                setForm(f => ({ ...f, biography: e.target.value }));
                if (errors.biography) setErrors(p => ({ ...p, biography: '' }));
              }}
              placeholder="Tell us about your teaching philosophy..."
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none placeholder:text-[#6B7280] ${
                errors.biography ? 'border-red-300 bg-red-50' : 'border-[#E5E7EB]'
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-[#6B7280]">Maximum 100 words</p>
              <p
                className={`text-xs font-medium ${
                  bioWordCount > 100 ? 'text-red-500' : 'text-gray-400'
                }`}
              >
                {bioWordCount} / 100 words
              </p>
            </div>
            {errors.biography && (
              <p className="text-xs text-red-500 mt-1">{errors.biography}</p>
            )}
          </div>

          {/* 9 ── Awards | Achievements ── */}
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Awards</label>
            <TagInput
              tags={form.awards ?? []}
              onChange={tags => setForm(f => ({ ...f, awards: tags }))}
              placeholder="e.g. Best Teacher Award 2024"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#374151] mb-1">Achievements</label>
            <TagInput
              tags={form.achievements ?? []}
              onChange={tags => setForm(f => ({ ...f, achievements: tags }))}
              placeholder="e.g. Published research paper"
            />
          </div>

          {/* 10 ── Footer buttons ── */}
          <div className="md:col-span-2 flex gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: '#5046E5', borderRadius: '12px' }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editTeacher ? 'Update' : 'Add'} Teacher
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
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
