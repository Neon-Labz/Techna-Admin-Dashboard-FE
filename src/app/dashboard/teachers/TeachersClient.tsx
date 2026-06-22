'use client';

import { useState, useEffect, useRef } from 'react';
import type { Teacher } from '@/types';
import { teacherApi, type TeacherFromApi } from '@/api/teacher.api';
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
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── TagInput ─────────────────────────────────────────────────────────────────
function TagInput({
  tags,
  onChange,
  placeholder,
  hint,
  showChevron = false,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  hint?: string;
  showChevron?: boolean;
}) {
  const [val, setVal] = useState('');

  const add = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal('');
  };

  return (
    <div>
      <div className="relative">
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
          onBlur={add}
          placeholder={placeholder}
          className="w-full border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-[#374151] placeholder:text-[#6B7280] bg-white"
          style={{ height: '46px', paddingLeft: '13px', paddingRight: showChevron ? '40px' : '13px' }}
        />
        {showChevron && (
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: '#9CA3AF' }} />
        )}
      </div>
      {hint && (
        <p className="mt-1" style={{ fontSize: '10px', lineHeight: '15px', color: '#9CA3AF' }}>
          {hint}
        </p>
      )}
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

function formatSubjects(subjects: string[]): string {
  return subjects.join(', ');
}

function normalizeSubject(subject: TeacherFromApi['subject'] | string[]): string[] {
  if (Array.isArray(subject)) return subject;
  return subject.split(',').map(s => s.trim()).filter(Boolean);
}

function normalizePhotoUrl(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/\.r2\.devya\b/gi, '.r2.dev');
}

const TITLE_PREFIXES = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof',
  'mr.', 'mrs.', 'ms.', 'miss.', 'dr.', 'prof.',
]);

function stripTitle(name: string): string {
  return (name || '')
    .trim()
    .split(/\s+/)
    .filter(p => !TITLE_PREFIXES.has(p.toLowerCase()))
    .join(' ');
}

function titleFromGender(gender: Teacher['gender']): string {
  if (gender === 'male') return 'Mr.';
  if (gender === 'female') return 'Ms.';
  return '';
}

const FEMALE_NAMES = new Set([
  'nimali', 'geerthika', 'sara', 'sarah', 'mary', 'emma', 'olivia', 'sophia',
  'priya', 'anjali', 'deepika', 'kavya', 'lakshmi', 'shanthi', 'malini',
  'kumari', 'nisha', 'divya', 'ramya', 'thanuja', 'dilani', 'sandya',
  'jane', 'linda', 'susan', 'jessica', 'amanda', 'fatima', 'aisha',
]);

const MALE_NAMES = new Set([
  'michael', 'david', 'john', 'james', 'robert', 'william', 'hari', 'gowsikan',
  'gowsi', 'joe', 'suka', 'siva', 'kumar', 'raj', 'ravi', 'arun', 'vijay',
  'anil', 'sunil', 'mahesh', 'suresh', 'ramesh', 'athithya', 'kajan',
  'mohamed', 'ahmed', 'thomas', 'daniel', 'peter', 'paul', 'mark',
]);

function inferGender(name: string): Teacher['gender'] {
  const trimmed = (name || '').trim().toLowerCase();
  if (/^(mr|dr|prof)\.?\s/.test(trimmed)) return 'male';
  if (/^(mrs|ms|miss)\.?\s/.test(trimmed)) return 'female';
  const first = stripTitle(name).split(/\s+/)[0]?.toLowerCase() ?? '';
  if (!first) return '';
  if (FEMALE_NAMES.has(first)) return 'female';
  if (MALE_NAMES.has(first)) return 'male';
  return '';
}

function displayName(t: Teacher): string {
  const clean = stripTitle(t.name);
  const gender = t.gender || inferGender(t.name);
  const title = titleFromGender(gender);
  return title ? `${title} ${clean}` : clean;
}

function getInitials(name: string): string {
  const parts = stripTitle(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function mapApiTeacher(t: TeacherFromApi): Teacher {
  return {
    id: t._id,
    name: t.fullName,
    firstName: t.firstName ?? '',
    lastName: t.lastName ?? '',
    email: t.email,
    phone: t.phone,
    gender: t.gender || inferGender(t.fullName),
    subject: normalizeSubject(t.subject),
    qualification: t.qualification ?? '',
    experience: t.experience,
    address: t.address,
    joinDate: t.joinDate,
    status: t.status,
    photoUrl: normalizePhotoUrl(t.photoUrl),
    degree: t.degree ?? [],
    specializations: t.specializations ?? [],
    awards: t.awards ?? [],
    achievements: t.achievements ?? [],
    biography: t.biography ?? '',
  };
}

// ─── Form type ────────────────────────────────────────────────────────────────
type TeacherForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subjectText: string;
  qualification: string[];
  address: string;
  experience: string;
  joinDate: string;
  specializations: string[];
  biography: string;
  status: 'active' | 'inactive';
  awards: string[];
  achievements: string[];
};

const emptyTeacher: TeacherForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  subjectText: '',
  qualification: [],
  address: '',
  experience: '',
  joinDate: new Date().toISOString().split('T')[0],
  specializations: [],
  biography: '',
  status: 'active',
  awards: [],
  achievements: [],
};

// ─── Shared label style ───────────────────────────────────────────────────────
const LABEL: React.CSSProperties = {
  display: 'block',
  fontWeight: 700,
  fontSize: '14px',
  lineHeight: '20px',
  color: '#374151',
  marginBottom: '8px',
};

const INPUT_BASE =
  'w-full border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-[#374151] placeholder:text-[#6B7280] bg-white';

const INPUT_STYLE: React.CSSProperties = { height: '46px', paddingLeft: '13px', paddingRight: '13px' };

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);

  // formRef stays in sync with form state but updated SYNCHRONOUSLY so that
  // handleSubmit always reads the latest tag arrays even when onBlur fires
  // just before the submit event (React re-renders are async, refs are not).
  const formRef = useRef<TeacherForm>(emptyTeacher);
  const [form, _setForm] = useState<TeacherForm>(emptyTeacher);
  const setForm = ((updater: TeacherForm | ((prev: TeacherForm) => TeacherForm)) => {
    const next = typeof updater === 'function' ? updater(formRef.current) : updater;
    formRef.current = next;
    _setForm(next);
  }) as React.Dispatch<React.SetStateAction<TeacherForm>>;
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

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
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (t.name || '').toLowerCase().includes(term) ||
      displayName(t).toLowerCase().includes(term) ||
      (t.email || '').toLowerCase().includes(term) ||
      (t.phone || '').toLowerCase().includes(term) ||
      (t.qualification || '').toLowerCase().includes(term) ||
      formatSubjects(t.subject).toLowerCase().includes(term)
    );
  });

  const teacherToDelete = teachers.find(t => t.id === deleteConfirm);

  const openAdd = () => {
    setForm(emptyTeacher);
    setEditTeacher(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(false);
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    const firstName = t.firstName || t.name.split(' ')[0] || '';
    const lastName = t.lastName || t.name.split(' ').slice(1).join(' ') || '';
    setForm({
      firstName,
      lastName,
      email: t.email,
      phone: t.phone,
      subjectText: t.subject.join(', '),
      qualification: (t.qualification ?? '').split(',').map(s => s.trim()).filter(Boolean),
      address: t.address,
      experience: t.experience,
      joinDate: t.joinDate ?? new Date().toISOString().split('T')[0],
      specializations: t.specializations ?? [],
      biography: t.biography ?? '',
      status: t.status,
      awards: t.awards ?? [],
      achievements: t.achievements ?? [],
    });
    setEditTeacher(t);
    setPhotoFile(null);
    setPhotoPreview(t.photoUrl ?? null);
    setPhotoRemoved(false);
    setModalOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const subjects = form.subjectText.split(',').map(s => s.trim()).filter(Boolean);
    if (subjects.length === 0) {
      toast.error('Please enter at least one subject');
      return;
    }
    if (form.biography && countWords(form.biography) > 100) {
      toast.error('Bio must not exceed 100 words');
      return;
    }
    const fullName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ');
    if (!fullName) {
      toast.error('Please enter a first name');
      return;
    }

    try {
      setSaving(true);
      const latest = formRef.current;
      const payload = {
        fullName,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: subjects,
        qualification: latest.qualification.join(', '),
        experience: form.experience.trim(),
        address: form.address.trim(),
        joinDate: form.joinDate,
        status: form.status,
        specializations: latest.specializations,
        awards: latest.awards,
        achievements: latest.achievements,
        biography: form.biography.trim(),
      };

      let savedId: string;
      if (editTeacher) {
        await teacherApi.update(editTeacher.id, payload);
        savedId = editTeacher.id;
      } else {
        const created = await teacherApi.create(payload);
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
      } else if (photoRemoved && editTeacher && savedId) {
        try {
          await teacherApi.removePhoto(savedId);
        } catch {
          toast.error('Failed to remove photo from storage');
        }
        toast.success('Teacher updated!');
      } else {
        toast.success(editTeacher ? 'Teacher updated!' : 'Teacher added!');
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

  const bioWordCount = countWords(form.biography);

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">

      {/* ── Header ── */}
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

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* ── Teacher cards ── */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(t => (
            <div key={t.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {t.photoUrl ? (
                    <img
                      src={t.photoUrl}
                      alt={t.name}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.removeAttribute('style');
                      }}
                    />
                  ) : null}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100"
                    style={t.photoUrl ? { display: 'none' } : undefined}
                  >
                    <span className="text-indigo-600 font-bold text-lg">
                      {getInitials(t.name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-gray-800">{displayName(t)}</h3>
                    <p className="break-words text-sm font-medium text-indigo-600">
                      {formatSubjects(t.subject)}
                    </p>
                  </div>
                </div>
                <span
                  className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
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
                    {[t.qualification, t.experience].filter(Boolean).join(' · ')}
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

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTeacher ? 'Edit Teacher' : 'Add New Teacher'}
        size="2xl"
        height="content"
        closeOnBackdrop={false}
        titleClassName="text-2xl text-[#1E1B4B]"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* 1 ── Profile Picture ── */}
          <div className="md:col-span-2 flex items-start gap-6 pb-5 border-b border-gray-100">
            <label htmlFor="teacher-photo-upload" className="cursor-pointer shrink-0">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{ background: '#F1F5F9', border: '2px dashed #E2E8F0', borderRadius: '9999px' }}
                >
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <line x1="6.67" y1="20" x2="33.33" y2="20" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="20" y1="6.67" x2="20" y2="33.33" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </label>
            <div>
              <p style={{ fontWeight: 600, fontSize: '18px', lineHeight: '28px', color: '#1F2937' }}>
                Profile Picture
              </p>
              <p style={{ fontSize: '12px', lineHeight: '16px', color: '#6B7280', marginTop: '0px', marginBottom: '16px' }}>
                Optional. Recommended 200×200px. JPG, PNG
              </p>
              <div className="flex gap-3 flex-wrap">
                <label
                  htmlFor="teacher-photo-upload"
                  className="cursor-pointer flex items-center justify-center font-semibold text-white"
                  style={{
                    background: '#2563EB',
                    borderRadius: '6px',
                    height: '36px',
                    fontSize: '14px',
                    lineHeight: '20px',
                    padding: '0 16px',
                    boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
                  }}
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
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoRemoved(true); }}
                    className="flex items-center justify-center font-semibold"
                    style={{
                      background: '#F1F5F9',
                      borderRadius: '6px',
                      height: '36px',
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#4B5563',
                      padding: '0 16px',
                    }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2 ── First Name | Last Name ── */}
          <div>
            <label style={LABEL}>First Name</label>
            <input
              type="text"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              placeholder="John"
              required
              className={INPUT_BASE}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL}>Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              placeholder="Doe"
              className={INPUT_BASE}
              style={INPUT_STYLE}
            />
          </div>

          {/* 3 ── Email | Contact Number ── */}
          <div>
            <label style={LABEL}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="john.doe@school.edu"
              required
              className={INPUT_BASE}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL}>Contact Number</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
              required
              className={INPUT_BASE}
              style={INPUT_STYLE}
            />
          </div>

          {/* 4 ── Subject | Qualifications ── */}
          <div>
            <label style={LABEL}>Subject</label>
            <input
              type="text"
              value={form.subjectText}
              onChange={e => setForm(f => ({ ...f, subjectText: e.target.value }))}
              placeholder="Mathematics"
              className={INPUT_BASE}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL}>Qualifications</label>
            <TagInput
              tags={form.qualification}
              onChange={tags => setForm(f => ({ ...f, qualification: tags }))}
              placeholder="M.Sc. in Mathematics"
            />
          </div>

          {/* 5 ── Address (full width) ── */}
          <div className="md:col-span-2">
            <label style={LABEL}>Address</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="123 Academic Way, Education City"
              required
              className={INPUT_BASE}
              style={INPUT_STYLE}
            />
          </div>

          {/* 6 ── Experience | Join Date ── */}
          <div>
            <label style={LABEL}>Experience (e.g. 5 years)</label>
            <input
              type="text"
              value={form.experience}
              onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}
              placeholder="5 years"
              required
              className={INPUT_BASE}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL}>Join Date</label>
            <input
              type="date"
              value={form.joinDate}
              onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))}
              required
              className={INPUT_BASE}
              style={INPUT_STYLE}
            />
          </div>

          {/* 7 ── Area of Specialization | Status ── */}
          <div>
            <label style={LABEL}>Area of Specialization</label>
            <TagInput
              tags={form.specializations}
              onChange={tags => setForm(f => ({ ...f, specializations: tags }))}
              placeholder="Quantum Mechanics"
            />
          </div>
          <div>
            <label style={LABEL}>Status</label>
            <div className="relative">
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                className="w-full appearance-none border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base bg-white"
                style={{ height: '46px', paddingLeft: '13px', paddingRight: '40px', color: '#4B5563' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                style={{ color: '#6B7280' }}
              />
            </div>
          </div>

          {/* 8 ── Bio (full width) ── */}
          <div className="md:col-span-2">
            <label style={LABEL}>Bio</label>
            <textarea
              value={form.biography}
              onChange={e => setForm(f => ({ ...f, biography: e.target.value }))}
              placeholder="Tell us about your teaching philosophy..."
              rows={4}
              className="w-full border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base placeholder:text-[#6B7280] text-[#374151] resize-none bg-white"
              style={{ padding: '11px 13px' }}
            />
            <div className="flex items-center justify-between mt-1">
              <p style={{ fontSize: '12px', lineHeight: '16px', color: '#9CA3AF' }}>Maximum 100 words</p>
              <p style={{ fontSize: '12px', color: bioWordCount > 100 ? '#EF4444' : '#9CA3AF' }}>
                {bioWordCount} / 100 words
              </p>
            </div>
          </div>

          {/* 9 ── Awards | Achievements ── */}
          <div>
            <label style={LABEL}>Awards</label>
            <TagInput
              tags={form.awards}
              onChange={tags => setForm(f => ({ ...f, awards: tags }))}
              placeholder="Teacher of the Year 2023"
            />
          </div>
          <div>
            <label style={LABEL}>Achievements</label>
            <TagInput
              tags={form.achievements}
              onChange={tags => setForm(f => ({ ...f, achievements: tags }))}
              placeholder="Published Research Paper"
            />
          </div>

          {/* 10 ── Footer ── */}
          <div className="md:col-span-2 flex gap-4 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors"
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                height: '50px',
                fontWeight: 700,
                fontSize: '16px',
                lineHeight: '24px',
                color: '#6B7280',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity"
              style={{
                background: '#5046E5',
                borderRadius: '12px',
                height: '48px',
                fontWeight: 700,
                fontSize: '16px',
                lineHeight: '24px',
                color: '#FFFFFF',
                boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)',
              }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editTeacher ? 'Update Teacher' : 'Add Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Modal ── */}
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
            Remove {teacherToDelete ? displayName(teacherToDelete) : 'this teacher'}?
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
