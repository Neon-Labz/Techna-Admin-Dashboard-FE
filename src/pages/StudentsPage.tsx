'use client';

import { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import type { Student, PaymentRecord } from '../types';
import Modal from '../components/ui/Modal';
import StudentCard from '../components/students/StudentCard';
import StudentProfile from '../components/students/StudentProfile';
import StudentRegistrationWizard from '../components/students/StudentRegistrationWizard';
import { Plus, Search, Filter, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceApi } from '../api/attendance.api';
import { paymentApi } from '../api/payment.api';
import { getModules, type ApiModule } from '../lib/api';
import { cleanOlResults, OL_GRADE_OPTIONS } from '../utils/studentPayload';

const DISTRICT_OPTIONS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

const RACE_OPTIONS = [
  'Sinhala',
  'Tamil',
  'Indian Tamil',
  'Muslim',
  'Burgher',
  'Malay',
  'Other',
];

const RELIGION_OPTIONS = [
  'Buddhism',
  'Hinduism',
  'Islam',
  'Christianity',
  'Catholicism',
  'Other',
];

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
  const [moduleOptions, setModuleOptions] = useState<ApiModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

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
    } finally {
      setModulesLoading(false);
    }
  };

  useEffect(() => {
    void fetchModuleOptions();
  }, []);

  const getStudentName = (s: any) =>
    s?.name || s?.fullNameEnglish || s?.fullNameTamil || 'Student';

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
    if (Array.isArray(s.subjects) && s.subjects.length > 0) return s.subjects;
    if (Array.isArray(s.modules) && s.modules.length > 0) return s.modules;
    if (
      Array.isArray(s.subjectSelection?.subjects) &&
      s.subjectSelection.subjects.length > 0
    ) {
      return s.subjectSelection.subjects;
    }
    if (
      Array.isArray(s.subjectSelection?.enrolledModules) &&
      s.subjectSelection.enrolledModules.length > 0
    ) {
      return s.subjectSelection.enrolledModules;
    }
    if (Array.isArray(s.enrolledModules) && s.enrolledModules.length > 0) {
      return s.enrolledModules;
    }
    return [];
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

    const selectedModules =
      form.subjects?.length ? form.subjects : form.modules || [];

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
    const s: any = students.find((x) => x.id === id);
    const name = getStudentName(s);
    try {
      await approveStudent(id);
      toast.success(`${name} approved!`);
      await fetchStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve student');
    }
  };

  const getModuleName = (moduleId: string) => {
    const mod = modules.find(
      (m: any) => m.id === moduleId || m._id === moduleId || m.name === moduleId,
    );
    return mod?.name || moduleId;
  };

  const normalizeRecordDate = (value?: string) => {
    if (!value) return '';
    return value.includes('T') ? value.split('T')[0] : value;
  };

  const patchStudentRecords = (
    studentId: string,
    records: Partial<Pick<Student, 'attendance' | 'payments'>>,
  ) => {
    useDataStore.setState((state) => ({
      students: state.students.map((student) =>
        student.id === studentId ? { ...student, ...records } : student,
      ),
    }));

    setViewStudent((student) =>
      student?.id === studentId ? { ...student, ...records } : student,
    );
  };

  const loadStudentRecords = async (student: Student) => {
    try {
      const attendanceStudentId = student.studentId || student.id;
      const [attendanceRecords, payments] = await Promise.all([
        attendanceApi.getByStudent(attendanceStudentId),
        paymentApi.getByStudent(student.id),
      ]);

      const attendance = attendanceRecords.map((record: any) => ({
        ...record,
        id: record.id || record._id,
        date: normalizeRecordDate(record.date),
      }));

      patchStudentRecords(student.id, { attendance, payments });
    } catch (error) {
      console.warn('Failed to load student records');
      toast.error('Failed to load student records');
    }
  };

  const openProfile = (student: Student) => {
    setViewStudent(student);
    void loadStudentRecords(student);
  };

  const handlePaymentAdd = async (
    studentId: string,
    payment: Omit<PaymentRecord, 'id'>,
  ) => {
    try {
      const savedPayment = await paymentApi.create(payment);
      const currentStudent = students.find((student) => student.id === studentId);
      const nextPayments = [...(currentStudent?.payments || []), savedPayment];

      patchStudentRecords(studentId, { payments: nextPayments });
      toast.success('Payment recorded!');
    } catch (error) {
      console.warn('Failed to record payment');
      toast.error('Failed to record payment');
    }
  };

  const handleStatusChange = async (
  id: string,
  status: 'pending' | 'approved' | 'rejected',
) => {
  const s: any = students.find((x) => x.id === id);
  const name = getStudentName(s);

  if (status === 'approved') {
    try {
      await approveStudent(id);
      toast.success(`${name} approved!`);
      await fetchStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve student');
    }
    return;
  }

  if (status === 'rejected') {
    setRejectConfirm(id);
    setRejectReason('');
    return;
  }

  try {
    await updateStudent(id, { status });
    toast.success(`Student status set to ${status}!`);
    await fetchStudents();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to update status');
  }
};

  const handleRejectConfirm = async () => {
    if (!rejectConfirm || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const s: any = students.find((x) => x.id === rejectConfirm);
    const name = getStudentName(s);

    setRejectLoading(true);
    try {
      await rejectStudent(rejectConfirm, rejectReason.trim());
      toast.error(`${name} rejected.`);
      setRejectConfirm(null);
      setRejectReason('');
      await fetchStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject student');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleAttendanceUpdate = async (
    studentId: string,
    moduleId: string,
    date: string,
    status: 'present' | 'absent',
  ) => {
    try {
      const currentStudent = students.find((student) => student.id === studentId);
      const attendanceStudentId = currentStudent?.studentId || studentId;
      const savedAttendance = await attendanceApi.markAttendance({
        studentId: attendanceStudentId,
        moduleId,
        moduleName: getModuleName(moduleId),
        date,
        status,
      });
      const normalizedAttendance = {
        ...savedAttendance,
        id: savedAttendance.id || savedAttendance._id,
        studentId: attendanceStudentId,
        moduleId,
        moduleName: savedAttendance.moduleName || getModuleName(moduleId),
        date: normalizeRecordDate(savedAttendance.date || date),
        status,
        markedAt: savedAttendance.markedAt || new Date().toISOString(),
      };
      const existingAttendance = currentStudent?.attendance || [];
      const nextAttendance = existingAttendance.some(
        (record) =>
          record.moduleId === moduleId && normalizeRecordDate(record.date) === date,
      )
        ? existingAttendance.map((record) =>
            record.moduleId === moduleId &&
            normalizeRecordDate(record.date) === date
              ? { ...record, ...normalizedAttendance }
              : record,
          )
        : [...existingAttendance, normalizedAttendance];

      patchStudentRecords(studentId, { attendance: nextAttendance });
    } catch (error) {
      console.warn('Failed to update attendance');
      toast.error('Failed to update attendance');
    }
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
  ] as const;

  const selectedModules =
    form.subjects?.length ? form.subjects : form.modules || [];

  const normalizeModuleKey = (value?: string) =>
    (value || '').trim().toLowerCase();

  const isModuleSelected = (module: ApiModule) => {
    const moduleKeys = [
      module._id,
      (module as any).id,
      module.name,
    ]
      .map(normalizeModuleKey)
      .filter(Boolean);

    return selectedModules.some((selected: string) =>
      moduleKeys.includes(normalizeModuleKey(selected)),
    );
  };

  return (
    <div className="p-3 pb-20 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between mb-6">
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
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
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

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
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
            className="px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          >
            <option value="">All Status</option>
            <option value="pending">PENDING</option>
            <option value="approved">APPROVED</option>
            <option value="rejected">REJECTED</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((s, index) => (
          <StudentCard
            key={s.id || `student-${index}`}
            student={s}
            onView={() => openProfile(s)}
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
        size="2xl"
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
            className="space-y-4 max-h-[75vh] overflow-y-auto pr-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {editFields.map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>

                  {field === 'administrativeDistrict' ? (
                    <select
                      value={form.administrativeDistrict || ''}
                      onChange={(e) =>
                        handleChange('administrativeDistrict', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                    >
                      <option value="">Select District</option>
                      {DISTRICT_OPTIONS.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  ) : (
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  )}
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Race
                </label>
                <select
                  value={form.race || ''}
                  onChange={(e) => handleChange('race', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  <option value="">Select Race</option>
                  {RACE_OPTIONS.map((race) => (
                    <option key={race} value={race}>
                      {race}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Religion
                </label>
                <select
                  value={form.religion || ''}
                  onChange={(e) => handleChange('religion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  <option value="">Select Religion</option>
                  {RELIGION_OPTIONS.map((religion) => (
                    <option key={religion} value={religion}>
                      {religion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch
                </label>
                <input
                  type="text"
                  value={form.batch || ''}
                  onChange={(e) => handleChange('batch', e.target.value)}
                  placeholder="Enter batch"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
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
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Name Used
                  </label>
                  <input
                    value={form.olNameUsed || ''}
                    onChange={(e) => handleChange('olNameUsed', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Accept Status
                  </label>
                  <select
                    value={form.olAccept || 'Accept'}
                    onChange={(e) => handleChange('olAccept', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          value={row.indexNumber || ''}
                          onChange={(e) =>
                            updateOlRow(index, 'indexNumber', e.target.value)
                          }
                          placeholder="Index Number"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
        size="sm"
      >
        <p className="text-gray-600 text-sm mb-5">
          Are you sure you want to delete this student? All records will be lost.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              if (deleteConfirm) {
                deleteStudent(deleteConfirm);
              }
              setDeleteConfirm(null);
              toast.success('Student deleted');
            }}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!rejectConfirm}
        onClose={() => {
          setRejectConfirm(null);
          setRejectReason('');
        }}
        title="Reject Student"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Please provide a reason for rejecting this student. A rejection email will be sent to the student&apos;s registered email address.
          </p>

          {rejectConfirm && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Student</p>
              <p className="text-sm font-medium text-gray-800">
                {getStudentName(students.find((s) => s.id === rejectConfirm))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                📧 {students.find((s) => s.id === rejectConfirm)?.email}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
            />
            {rejectReason.trim().length > 0 && rejectReason.trim().length < 3 && (
              <p className="text-xs text-red-500 mt-1">
                Reason must be at least 3 characters
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setRejectConfirm(null);
                setRejectReason('');
              }}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={handleRejectConfirm}
              disabled={rejectLoading || rejectReason.trim().length < 3}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejectLoading ? 'Rejecting...' : 'Reject & Send Email'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
