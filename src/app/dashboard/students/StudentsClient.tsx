'use client';

import { useEffect, useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import type { Student, PaymentRecord } from '@/types';
import Modal from '@/components/ui/Modal';
import DeleteModal from '@/components/common/DeleteModal';
import StudentCard from '@/components/students/StudentCard';
import StudentProfile from '@/components/students/StudentProfile';
import StudentRegistrationWizard from '@/components/students/StudentRegistrationWizard';
import { Plus, Search, Filter, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AL_SUBJECT_OPTIONS,
  normalizeAlSubjects,
} from '@/utils/studentPayload';

const emptyStudent: any = {
  name: '',
  fullNameEnglish: '',
  fullNameTamil: '',
  email: '',
  phone: '',
  whatsappNo: '',
  parentsNo: '',
  address: '',
  permanentAddress: '',
  contactAddress: '',
  administrativeDistrict: '',
  postalCode: '',
  dob: '',
  dateOfBirth: '',
  nicNo: '',
  school: '',
  fatherName: '',
  motherName: '',
  guardianName: '',
  guardianMobile: '',
  parentName: '',
  parentPhone: '',
  race: '',
  religion: '',
  batch: '',
  modules: [],
  subjects: [],
  status: 'pending',
  enrolledAt: new Date().toISOString(),
};

export default function StudentsPage() {
  const {
    students,
    modules,
    fetchStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    approveStudent,
  } = useDataStore();

  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<any>(emptyStudent);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const getStudentName = (s: any) =>
    s.name || s.fullNameEnglish || s.fullNameTamil || '';

  const filtered = students.filter((s: any) => {
    const q = search.toLowerCase();

    const matchSearch =
      getStudentName(s).toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q);

    const matchBatch = !filterBatch || s.batch === filterBatch;
    const matchStatus = !filterStatus || s.status === filterStatus;

    return matchSearch && matchBatch && matchStatus;
  });

  const studentToDelete = students.find((s) => s.id === deleteConfirm);

  const openAdd = () => {
    setForm(emptyStudent);
    setEditStudent(null);
    setModalOpen(true);
  };

  const formatDateForInput = (value?: string) => {
    if (!value) return '';
    return value.includes('T') ? value.split('T')[0] : value;
  };

  const getSelectedModules = (s: any) => {
    if (Array.isArray(s.subjects) && s.subjects.length > 0) {
      return normalizeAlSubjects(s.subjects);
    }
    if (Array.isArray(s.modules) && s.modules.length > 0) {
      return normalizeAlSubjects(s.modules);
    }
    if (
      Array.isArray(s.subjectSelection?.subjects) &&
      s.subjectSelection.subjects.length > 0
    ) {
      return normalizeAlSubjects(s.subjectSelection.subjects);
    }
    return normalizeAlSubjects([]);
  };

  const openEdit = (s: any) => {
    const selectedModules = getSelectedModules(s);

    setForm({
      ...emptyStudent,
      ...s,
      name: s.name || s.fullNameEnglish || '',
      fullNameEnglish: s.fullNameEnglish || s.name || '',
      fullNameTamil: s.fullNameTamil || '',
      email: s.email || '',
      phone: s.phone || s.whatsappNo || '',
      whatsappNo: s.whatsappNo || s.phone || '',
      parentsNo: s.parentsNo || s.parentPhone || '',
      address: s.address || s.permanentAddress || '',
      permanentAddress: s.permanentAddress || s.address || '',
      contactAddress: s.contactAddress || '',
      administrativeDistrict: s.administrativeDistrict || '',
      postalCode: s.postalCode || '',
      dob: formatDateForInput(s.dob || s.dateOfBirth),
      dateOfBirth: formatDateForInput(s.dateOfBirth || s.dob),
      nicNo: s.nicNo || '',
      school: s.school || '',
      fatherName: s.fatherName || '',
      motherName: s.motherName || '',
      guardianName: s.guardianName || s.parentName || '',
      guardianMobile: s.guardianMobile || s.parentPhone || '',
      parentName: s.parentName || s.guardianName || '',
      parentPhone: s.parentPhone || s.parentsNo || s.guardianMobile || '',
      race: s.race || '',
      religion: s.religion || '',
      batch: s.batch || '',
      modules: selectedModules,
      subjects: selectedModules,
      status: s.status || 'pending',
      enrolledAt: s.enrolledAt || new Date().toISOString(),
    });

    setEditStudent(s);
    setModalOpen(true);
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleModule = (moduleName: string) => {
    setForm((prev: any) => {
      const current = Array.isArray(prev.subjects)
        ? prev.subjects
        : Array.isArray(prev.modules)
          ? prev.modules
          : [];

      const updated = current.includes(moduleName)
        ? current.filter((m: string) => m !== moduleName)
        : [...current, moduleName];

      return {
        ...prev,
        subjects: updated,
        modules: updated,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editStudent) return;

    const selectedModules = normalizeAlSubjects(
      form.subjects?.length ? form.subjects : form.modules || [],
    );

    const payload = {
      ...form,
      name: form.fullNameEnglish || form.name,
      phone: form.phone || form.whatsappNo,
      whatsappNo: form.whatsappNo || form.phone,
      parentName: form.parentName || form.guardianName,
      parentPhone: form.parentPhone || form.parentsNo || form.guardianMobile,
      address: form.address || form.permanentAddress,
      permanentAddress: form.permanentAddress || form.address,
      dateOfBirth: form.dateOfBirth || form.dob,
      dob: form.dob || form.dateOfBirth,
      subjects: selectedModules,
      modules: selectedModules,
    };

    await updateStudent(editStudent.id, payload);
    toast.success('Student updated!');
    setModalOpen(false);
  };

  const preventEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleWizardSubmit = async (payload: any) => {
    try {
      await addStudent(payload);
      toast.success('Student added!');
      setModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add student',
      );
    }
  };

  const handleApprove = async (id: string) => {
    await approveStudent(id);
    const s: any = students.find((x) => x.id === id);
    toast.success(`✅ ${getStudentName(s)} approved!`);
  };

  const handlePaymentAdd = (
    studentId: string,
    payment: Omit<PaymentRecord, 'id'>,
  ) => {
    useDataStore.getState().addPayment(studentId, payment);
    toast.success('Payment recorded!');
  };

  const handleStatusChange = async (
    id: string,
    status: 'pending' | 'approved' | 'rejected',
  ) => {
    await updateStudent(id, {
      status,
      ...(status === 'approved'
        ? { approvedAt: new Date().toISOString() }
        : {}),
    });
    toast.success(`Student ${status}!`);
  };

  const handleAttendanceUpdate = (
    studentId: string,
    moduleId: string,
    date: string,
    status: 'present' | 'absent',
  ) => {
    useDataStore.getState().updateAttendance(studentId, moduleId, date, status);
  };

  const currentViewStudent = viewStudent
    ? students.find((s) => s.id === viewStudent.id) || viewStudent
    : null;

  const batchOptions = [
    'All Batches',
    ...Array.from(
      new Set(
        students.map((student: any) => student.batch).filter(Boolean),
      ),
    ),
  ];

  const editFields = [
    ['fullNameEnglish', 'Full Name English'],
    ['fullNameTamil', 'Full Name Tamil'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['whatsappNo', 'WhatsApp No'],
    ['parentsNo', 'Parents No'],
    ['dob', 'Date of Birth'],
    ['nicNo', 'NIC No'],
    ['school', 'School'],
    ['permanentAddress', 'Permanent Address'],
    ['contactAddress', 'Contact Address'],
    ['administrativeDistrict', 'Administrative District'],
    ['postalCode', 'Postal Code'],
    ['fatherName', 'Father Name'],
    ['motherName', 'Mother Name'],
    ['guardianName', 'Guardian Name'],
    ['guardianMobile', 'Guardian Mobile'],
    ['race', 'Race'],
    ['religion', 'Religion'],
  ] as const;

  const selectedModules =
    form.subjects?.length ? form.subjects : form.modules || [];

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Students</h1>
          <p className="text-gray-500 text-sm">
            {students.length} total ·{' '}
            {students.filter((s) => s.status === 'pending').length} pending
            approval
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          />
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 sm:flex">
          <Filter className="h-4 w-4 shrink-0 text-gray-400" />
          <select
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
            className="min-w-0 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          >
            {batchOptions.map((b) => (
              <option key={b} value={b === 'All Batches' ? '' : b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="min-w-0 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((s) => (
          <StudentCard
            key={s.id}
            student={s}
            onView={() => setViewStudent(s)}
            onEdit={() => openEdit(s)}
            onDelete={() => setDeleteConfirm(s.id)}
            onApprove={() => handleApprove(s.id)}
            onStatusChange={(status) => handleStatusChange(s.id, status)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No students found</p>
        </div>
      )}

      {currentViewStudent && (
        <StudentProfile
          student={currentViewStudent}
          onClose={() => setViewStudent(null)}
          onPaymentAdd={(payment) =>
            handlePaymentAdd(currentViewStudent.id, payment)
          }
          onAttendanceUpdate={(moduleId, date, status) =>
            handleAttendanceUpdate(currentViewStudent.id, moduleId, date, status)
          }
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editStudent ? 'Edit Student' : 'Add New Student'}
        size="xl"
        height="content"
        closeOnBackdrop={false}
      >
        {!editStudent ? (
          <StudentRegistrationWizard
            modules={modules}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleWizardSubmit}
          />
        ) : (
          <form
            onSubmit={handleSubmit}
            onKeyDown={preventEnterSubmit}
            className="w-full min-w-0 max-w-full space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {editFields.map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>

                  <input
                    type={
                      field === 'dob'
                        ? 'date'
                        : field === 'email'
                          ? 'email'
                          : 'text'
                    }
                    value={form[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    required={['fullNameEnglish', 'email', 'phone'].includes(
                      field,
                    )}
                    className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch
                </label>
                <select
                  value={form.batch}
                  onChange={(e) => handleChange('batch', e.target.value)}
                  className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                >
                  {batchOptions
                    .filter((b) => b !== 'All Batches')
                    .map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  {form.batch && !batchOptions.includes(form.batch) && (
                    <option value={form.batch}>{form.batch}</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enrolled Modules
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AL_SUBJECT_OPTIONS.map((moduleName) => {
                  const checked = selectedModules.includes(moduleName);

                  return (
                    <label
                      key={moduleName}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm ${
                        checked
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModule(moduleName)}
                        className="rounded border-gray-300"
                      />
                      {moduleName}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                Update Student
              </button>
            </div>
          </form>
        )}
      </Modal>

      <DeleteModal
        open={!!deleteConfirm}
        title="Delete Student"
        itemName={studentToDelete ? getStudentName(studentToDelete) : undefined}
        message="This will permanently delete the student profile and all related records."
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;

          setDeleting(true);
          try {
            await deleteStudent(deleteConfirm);
            setDeleteConfirm(null);
            toast.success('Student deleted');
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
