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

const BATCHES = [
  'May 2024 Batch',
  'September 2024 Batch',
  'January 2025 Batch',
  'May 2025 Batch',
];

const emptyStudent: Omit<
  Student,
  'id' | 'studentId' | 'attendance' | 'payments' | 'qrToken'
> = {
  name: '',
  email: '',
  phone: '',
  address: '',
  dob: '',
  batch: BATCHES[0],
  modules: [],
  status: 'pending',
  enrolledAt: new Date().toISOString(),
  parentName: '',
  parentPhone: '',
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
  const [form, setForm] = useState<
    Omit<Student, 'id' | 'studentId' | 'attendance' | 'payments' | 'qrToken'>
  >(emptyStudent);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filtered = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchBatch = !filterBatch || s.batch === filterBatch;
    const matchStatus = !filterStatus || s.status === filterStatus;

    return matchSearch && matchBatch && matchStatus;
  });

  const openAdd = () => {
    setForm(emptyStudent);
    setEditStudent(null);
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      dob: s.dob,
      batch: s.batch,
      modules: s.modules,
      status: s.status,
      enrolledAt: s.enrolledAt,
      parentName: s.parentName || '',
      parentPhone: s.parentPhone || '',
    });
    setEditStudent(s);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editStudent) {
      updateStudent(editStudent.id, form);
      toast.success('Student updated!');
    } else {
      addStudent(form);
      toast.success('Student added!');
    }

    setModalOpen(false);
  };

  const handleWizardSubmit = async (
    payload: Omit<
      Student,
      'id' | 'studentId' | 'attendance' | 'payments' | 'qrToken'
    >,
  ) => {
    await addStudent(payload);
    toast.success('Student added!');
    setModalOpen(false);
  };

  const handleApprove = (id: string) => {
    approveStudent(id);
    const s = students.find((x) => x.id === id);
    toast.success(`✅ ${s?.name} approved!`);
  };

  const toggleModule = (mid: string) => {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(mid)
        ? f.modules.filter((m) => m !== mid)
        : [...f.modules, mid],
    }));
  };

  const handlePaymentAdd = (
    studentId: string,
    payment: Omit<PaymentRecord, 'id'>,
  ) => {
    useDataStore.getState().addPayment(studentId, payment);
    toast.success('Payment recorded!');
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

  return (
    <div className="p-6">
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
            <option value="">All Batches</option>
            {BATCHES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
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
            modules={modules}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleWizardSubmit}
          />
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              [
                'name',
                'email',
                'phone',
                'address',
                'dob',
                'parentName',
                'parentPhone',
              ] as const
            ).map((f) => (
              <div key={f}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {f === 'dob'
                    ? 'Date of Birth'
                    : f === 'parentName'
                      ? 'Parent Name'
                      : f === 'parentPhone'
                        ? 'Parent Phone'
                        : f.charAt(0).toUpperCase() + f.slice(1)}
                </label>

                <input
                  type={f === 'dob' ? 'date' : f === 'email' ? 'email' : 'text'}
                  value={(form as unknown as Record<string, string>)[f] || ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [f]: e.target.value }))
                  }
                  required={['name', 'email', 'phone'].includes(f)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch
              </label>
              <select
                value={form.batch}
                onChange={(e) =>
                  setForm((f) => ({ ...f, batch: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {BATCHES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enrolled Modules
            </label>

            <div className="flex flex-wrap gap-2">
              {modules.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModule(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.modules.includes(m.id)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
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
              {editStudent ? 'Update' : 'Add'} Student
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
              deleteConfirm && deleteStudent(deleteConfirm);
              setDeleteConfirm(null);
              toast.success('Student deleted');
            }}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
