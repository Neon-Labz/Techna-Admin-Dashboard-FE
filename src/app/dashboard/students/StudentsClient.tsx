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
import { getModules, type ApiModule } from '@/lib/api';
import {
  cleanOlResults,
  normalizeAlSubjects,
  OL_GRADE_OPTIONS,
} from '@/utils/studentPayload';

const emptyOL = {
  year: '',
  indexNumber: '',
  english: '',
  mathematics: '',
  science: '',
  sinhala: '',
  tamil: '',
};

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
  olCategory: 'Local O/L',
  olYear: '',
  olIndexNumber: '',
  olNameUsed: '',
  olAccept: 'Accept',
  olResults: [{ ...emptyOL }],
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
    rejectStudent,
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
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [moduleOptions, setModuleOptions] = useState<ApiModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const fetchModuleOptions = async () => {
    setModulesLoading(true);
    try {
      const fetchedModules = await getModules();
      setModuleOptions(Array.isArray(fetchedModules) ? fetchedModules : []);
    } catch (error) {
      console.error('Failed to load modules:', error);
      setModuleOptions([]);
      toast.error('Failed to load modules');
    } finally {
      setModulesLoading(false);
    }
  };

  useEffect(() => {
    void fetchModuleOptions();
  }, []);

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
    void fetchModuleOptions();
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
    if (
      Array.isArray(s.subjectSelection?.enrolledModules) &&
      s.subjectSelection.enrolledModules.length > 0
    ) {
      return normalizeAlSubjects(s.subjectSelection.enrolledModules);
    }
    if (Array.isArray(s.enrolledModules) && s.enrolledModules.length > 0) {
      return normalizeAlSubjects(s.enrolledModules);
    }
    return normalizeAlSubjects([]);
  };

  const openEdit = (s: any) => {
    void fetchModuleOptions();
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
      olCategory: s.olCategory || 'Local O/L',
      olYear: s.olYear || '',
      olIndexNumber: s.olIndexNumber || '',
      olNameUsed: s.olNameUsed || '',
      olAccept: s.olAccept || 'Accept',
      olResults:
        Array.isArray(s.olResults) && s.olResults.length > 0
          ? s.olResults
          : [{ ...emptyOL }],
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

  const updateOlRow = (index: number, field: keyof typeof emptyOL, value: string) => {
    setForm((prev: any) => ({
      ...prev,
      olResults: (prev.olResults || [{ ...emptyOL }]).map(
        (row: typeof emptyOL, rowIndex: number) =>
          rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const addOlRow = () => {
    setForm((prev: any) => ({
      ...prev,
      olResults: [...(prev.olResults || []), { ...emptyOL }],
    }));
  };

  const removeOlRow = (index: number) => {
    setForm((prev: any) => ({
      ...prev,
      olResults:
        (prev.olResults || []).length > 1
          ? prev.olResults.filter((_: any, rowIndex: number) => rowIndex !== index)
          : [{ ...emptyOL }],
    }));
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
      olCategory: form.olCategory || 'Local O/L',
      olYear: form.olYear || '',
      olIndexNumber: form.olIndexNumber || '',
      olNameUsed: form.olNameUsed || '',
      olAccept: form.olAccept || 'Accept',
      olResults: cleanOlResults(form.olResults || []),
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
    if (status === 'approved') {
      await handleApprove(id);
    } else if (status === 'rejected') {
      setRejectReason('');
      setRejectDialog(id);
    } else {
      await updateStudent(id, { status: 'pending' });
      toast.success('Student set to pending');
    }
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

  const normalizeModuleKey = (value?: string) =>
    normalizeAlSubjects([value || ''])[0]?.trim().toLowerCase() || '';

  const isModuleSelected = (module: ApiModule) => {
    const moduleKeys = [
      module._id,
      (module as any).id,
      module.name,
      normalizeAlSubjects([module.name])[0],
    ]
      .map(normalizeModuleKey)
      .filter(Boolean);

    return selectedModules.some((selected: string) =>
      moduleKeys.includes(normalizeModuleKey(selected)),
    );
  };

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
            modules={moduleOptions}
            modulesLoading={modulesLoading}
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

            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    O/L Results
                  </h3>
                  <p className="text-xs text-gray-400">
                    Edit student O/L exam details and subject grades
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addOlRow}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Row
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    O/L Category
                  </label>
                  <select
                    value={form.olCategory || 'Local O/L'}
                    onChange={(e) => handleChange('olCategory', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Local O/L">Local O/L</option>
                    <option value="London O/L">London O/L</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    O/L Year
                  </label>
                  <input
                    value={form.olYear || ''}
                    onChange={(e) => handleChange('olYear', e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    O/L Index Number
                  </label>
                  <input
                    value={form.olIndexNumber || ''}
                    onChange={(e) =>
                      handleChange('olIndexNumber', e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Name Used
                  </label>
                  <input
                    value={form.olNameUsed || ''}
                    onChange={(e) => handleChange('olNameUsed', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Accept Status
                  </label>
                  <select
                    value={form.olAccept || 'Accept'}
                    onChange={(e) => handleChange('olAccept', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Accept">Accept</option>
                    <option value="Change">Change</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(form.olResults || [{ ...emptyOL }]).map(
                  (row: typeof emptyOL, index: number) => (
                    <div
                      key={index}
                      className="rounded-xl border border-gray-200 bg-white p-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500">
                          Result Row {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeOlRow(index)}
                          className="text-xs font-semibold text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                          value={row.year || ''}
                          onChange={(e) =>
                            updateOlRow(index, 'year', e.target.value)
                          }
                          placeholder="Year"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          value={row.indexNumber || ''}
                          onChange={(e) =>
                            updateOlRow(index, 'indexNumber', e.target.value)
                          }
                          placeholder="Index Number"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                        {(
                          [
                            ['english', 'English'],
                            ['mathematics', 'Mathematics'],
                            ['science', 'Science'],
                            ['sinhala', 'Sinhala'],
                            ['tamil', 'Tamil'],
                          ] as const
                        ).map(([field, label]) => (
                          <div key={field}>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                              {label}
                            </label>
                            <select
                              value={row[field] || ''}
                              onChange={(e) =>
                                updateOlRow(index, field, e.target.value)
                              }
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Select grade</option>
                              {OL_GRADE_OPTIONS.map((grade) => (
                                <option key={grade} value={grade}>
                                  {grade}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enrolled Modules
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modulesLoading ? (
                  <p className="text-sm text-gray-400">Loading modules...</p>
                ) : moduleOptions.length === 0 ? (
                  <p className="text-sm text-gray-400">No modules found</p>
                ) : (
                  moduleOptions.map((module) => {
                    const checked = isModuleSelected(module);

                    return (
                      <label
                        key={module._id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm ${
                          checked
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleModule(module.name)}
                          className="rounded border-gray-300"
                        />
                        {module.name}
                      </label>
                    );
                  })
                )}
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

      <Modal
        isOpen={!!rejectDialog}
        onClose={() => setRejectDialog(null)}
        title="Reject Student"
        size="sm"
        height="content"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a reason for rejecting this student. This will be sent to the student by email.
          </p>
          <textarea
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none resize-none"
            rows={3}
            placeholder="e.g. Incomplete documentation, seat not available..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectDialog(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={rejecting || !rejectReason.trim()}
              onClick={async () => {
                if (!rejectDialog) return;
                setRejecting(true);
                try {
                  await rejectStudent(rejectDialog, rejectReason.trim());
                  const s: any = students.find((x) => x.id === rejectDialog);
                  toast.success(`${getStudentName(s)} rejected`);
                  setRejectDialog(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to reject student');
                } finally {
                  setRejecting(false);
                }
              }}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {rejecting ? 'Rejecting...' : 'Reject & Send Email'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
