import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Teacher,
  Student,
  Module,
  LectureVideo,
  PaymentRecord,
  Exam,
} from '../types';
import {
  approveStudent as approveStudentRequest,
  createStudent,
  deleteStudent as deleteStudentRequest,
  getStudents,
  updateStudent as updateStudentRequest,
} from '../api/studentApi';
import type { CreateStudentRequestPayload } from '../api/studentApi';

function generateStudentId(batch: string): string {
  const existing =
    JSON.parse(localStorage.getItem('edu-data') || '{}')?.students || [];
  const batchStudents = existing.filter((s: Student) => s.batch === batch);
  const num = (batchStudents.length + 1).toString().padStart(4, '0');
  const parts = batch.split(' ');
  const month = parts[0] || 'Jan';
  const year = parts[1] ? parts[1].slice(2) : '24';
  return `${month}${year}#${num}`;
}

const SAMPLE_MODULES: Module[] = [
  {
    id: 'm1',
    name: 'English',
    teacherId: 't1',
    teacherName: 'Ms. Sarah Johnson',
    description: 'Advanced English Language',
    duration: '6 months',
    fee: 5000,
    batch: 'May 2024 Batch',
    status: 'active',
    createdAt: '2024-05-01',
    videos: [],
  },
  {
    id: 'm2',
    name: 'Science',
    teacherId: 't2',
    teacherName: 'Mr. David Silva',
    description: 'Combined Science',
    duration: '6 months',
    fee: 6000,
    batch: 'May 2024 Batch',
    status: 'active',
    createdAt: '2024-05-01',
    videos: [],
  },
  {
    id: 'm3',
    name: 'Mathematics',
    teacherId: 't1',
    teacherName: 'Ms. Sarah Johnson',
    description: 'Advanced Mathematics',
    duration: '6 months',
    fee: 5500,
    batch: 'May 2024 Batch',
    status: 'active',
    createdAt: '2024-05-01',
    videos: [],
  },
];

const SAMPLE_TEACHERS: Teacher[] = [
  {
    id: 't1',
    name: 'Ms. Sarah Johnson',
    email: 'sarah@eduadmin.com',
    phone: '+94 77 111 2222',
    subject: 'English',
    qualification: 'B.Ed (English)',
    experience: '8 years',
    address: 'Colombo 03',
    joinDate: '2020-01-15',
    status: 'active',
  },
  {
    id: 't2',
    name: 'Mr. David Silva',
    email: 'david@eduadmin.com',
    phone: '+94 77 333 4444',
    subject: 'Science',
    qualification: 'B.Sc (Physics)',
    experience: '5 years',
    address: 'Colombo 05',
    joinDate: '2021-03-01',
    status: 'active',
  },
];

const SAMPLE_STUDENTS: Student[] = [];

const SAMPLE_EXAMS: Exam[] = [
  {
    id: 'e1',
    title: 'Mid-Term English',
    moduleId: 'm1',
    moduleName: 'English',
    batch: 'May 2024 Batch',
    date: '2024-07-15',
    startTime: '09:00',
    endTime: '11:00',
    venue: 'Hall A',
    totalMarks: 100,
    status: 'upcoming',
    createdAt: '2024-06-01',
  },
  {
    id: 'e2',
    title: 'Science Term Test',
    moduleId: 'm2',
    moduleName: 'Science',
    batch: 'May 2024 Batch',
    date: '2024-07-18',
    startTime: '13:00',
    endTime: '15:00',
    venue: 'Hall B',
    totalMarks: 100,
    status: 'upcoming',
    createdAt: '2024-06-01',
  },
];

interface DataStore {
  teachers: Teacher[];
  students: Student[];
  modules: Module[];
  videos: LectureVideo[];
  exams: Exam[];

  fetchStudents: () => Promise<void>;

  addTeacher: (t: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, t: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  addStudent: (
    s: Omit<Student, 'id' | 'studentId' | 'qrToken' | 'attendance' | 'payments'>,
  ) => Promise<void>;
  updateStudent: (id: string, s: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  approveStudent: (id: string) => Promise<void>;
  updateAttendance: (
    studentId: string,
    moduleId: string,
    date: string,
    status: 'present' | 'absent',
  ) => void;
  addPayment: (studentId: string, payment: Omit<PaymentRecord, 'id'>) => void;
  updatePayment: (
    studentId: string,
    paymentId: string,
    data: Partial<PaymentRecord>,
  ) => void;

  addModule: (m: Omit<Module, 'id' | 'videos'>) => void;
  updateModule: (id: string, m: Partial<Module>) => void;
  deleteModule: (id: string) => void;
  addVideo: (v: Omit<LectureVideo, 'id'>) => void;
  deleteVideo: (id: string) => void;

  addExam: (e: Omit<Exam, 'id'>) => void;
  updateExam: (id: string, e: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
}

function mapBackendStudent(s: any): Student {
  const displayName = s.name || s.fullNameEnglish || '';

  return {
    id: s._id || s.id,
    studentId: s.studentId || '',
    qrToken: s.qrToken || '',
    name: displayName,
    email: s.email || '',
    phone: s.phone || '',
    address: s.address || '',
    dob: s.dob || '',
    batch: s.batch || '',
    modules: s.modules || [],
    status: s.status || 'pending',
    avatar: s.avatar,
    parentName: s.parentName,
    parentPhone: s.parentPhone,
    enrolledAt: s.enrolledAt || s.createdAt || new Date().toISOString(),
    approvedAt: s.approvedAt,
    attendance: [],
    payments: [],
    password: s.password,
    fullNameTamil: s.fullNameTamil,
    fullNameEnglish: s.fullNameEnglish || s.name || '',
    nicNo: s.nicNo,
    school: s.school,
    whatsappNo: s.whatsappNo,
    parentsNo: s.parentsNo,
    permanentAddress: s.permanentAddress,
    administrativeDistrict: s.administrativeDistrict,
    fixedTelephone: s.fixedTelephone,
    residingSince: s.residingSince,
    race: s.race,
    religion: s.religion,
    citizenByDescent: s.citizenByDescent,
    contactAddress: s.contactAddress,
    postalCode: s.postalCode,
    fatherName: s.fatherName,
    motherName: s.motherName,
    guardianName: s.guardianName,
    contactPerson: s.contactPerson,
    guardianAddress: s.guardianAddress,
    guardianFixedTel: s.guardianFixedTel,
    guardianMobile: s.guardianMobile,
    olCategory: s.olCategory,
    olYear: s.olYear,
    olIndexNumber: s.olIndexNumber,
    olNameUsed: s.olNameUsed,
    olAccept: s.olAccept,
    olResults: s.olResults,
    subjects: s.subjects,
    declarationAccepted: s.declarationAccepted,
  };
}

function mapStudentToCreatePayload(
  s: Omit<Student, 'id' | 'studentId' | 'qrToken' | 'attendance' | 'payments'>,
  modules: Module[],
): CreateStudentRequestPayload {
  const selectedModules = Array.isArray(s.modules) ? s.modules : [];
  const selectedSubjects = Array.isArray(s.subjects) ? s.subjects : [];

  const normalizedModules =
    selectedModules.length > 0
      ? selectedModules
      : selectedSubjects
          .map((subject) => modules.find((module) => module.name === subject)?.id)
          .filter((moduleId): moduleId is string => Boolean(moduleId));

  return {
    name: s.fullNameEnglish?.trim() || s.name.trim(),
    fullNameEnglish: s.fullNameEnglish?.trim() || s.name.trim(),
    email: s.email.trim(),
    phone: s.whatsappNo?.trim() || s.phone.trim(),
    batch: s.batch.trim(),
    modules: normalizedModules,
    address: s.permanentAddress?.trim() || s.address.trim() || undefined,
    dob: s.dob?.trim() || undefined,
    parentName:
      s.parentName?.trim() ||
      s.motherName?.trim() ||
      s.fatherName?.trim() ||
      s.guardianName?.trim() || undefined,
    parentPhone:
      s.parentsNo?.trim() || s.guardianMobile?.trim() || s.parentPhone?.trim() || undefined,
    password: s.password?.trim() || '',
  };
}

function buildLocalStudentFallback(
  payload: Omit<Student, 'id' | 'studentId' | 'qrToken' | 'attendance' | 'payments'>,
  id?: string,
): Student {
  const localId = id || `s-${uuidv4()}`;

  return mapBackendStudent({
    ...payload,
    _id: localId,
    id: localId,
    studentId: generateStudentId(payload.batch),
    qrToken: `qr-${uuidv4()}`,
    attendance: [],
    payments: [],
  });
}

export const useDataStore = create<DataStore>()(
  persist(
    (set, get) => ({
      teachers: SAMPLE_TEACHERS,
      students: SAMPLE_STUDENTS,
      modules: SAMPLE_MODULES,
      videos: [],
      exams: SAMPLE_EXAMS,

      fetchStudents: async () => {
        try {
          const students = await getStudents();
          set({ students: students.map(mapBackendStudent) });
        } catch (error) {
          console.error('Failed to fetch students:', error);
        }
      },

      addTeacher: (t) =>
        set((state) => ({
          teachers: [...state.teachers, { ...t, id: `t-${uuidv4()}` }],
        })),

      updateTeacher: (id, t) =>
        set((state) => ({
          teachers: state.teachers.map((x) =>
            x.id === id ? { ...x, ...t } : x,
          ),
        })),

      deleteTeacher: (id) =>
        set((state) => ({
          teachers: state.teachers.filter((x) => x.id !== id),
        })),

      addStudent: async (s) => {
        try {
          const created = await createStudent(mapStudentToCreatePayload(s, get().modules));
          const mapped = created
            ? mapBackendStudent(created)
            : buildLocalStudentFallback(s);

          set((state) => ({
            students: [...state.students, mapped],
          }));
        } catch (error) {
          console.error('Failed to add student:', error);
        }
      },

      updateStudent: async (id, s) => {
        try {
          const updated = await updateStudentRequest(id, s);

          set((state) => ({
            students: state.students.map((x) =>
              x.id === id
                ? mapBackendStudent(updated || { ...x, ...s, _id: id })
                : x,
            ),
          }));
        } catch (error) {
          console.error('Failed to update student:', error);
        }
      },

      deleteStudent: async (id) => {
        try {
          await deleteStudentRequest(id);

          set((state) => ({
            students: state.students.filter((x) => x.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete student:', error);
        }
      },

      approveStudent: async (id) => {
        try {
          const approved = await approveStudentRequest(id);

          set((state) => ({
            students: state.students.map((x) =>
              x.id === id
                ? mapBackendStudent(
                    approved || {
                      ...x,
                      _id: id,
                      status: 'approved',
                      approvedAt: new Date().toISOString(),
                    },
                  )
                : x,
            ),
          }));
        } catch (error) {
          console.error('Failed to approve student:', error);
        }
      },

      updateAttendance: (studentId, moduleId, date, status) =>
        set((state) => ({
          students: state.students.map((s) => {
            if (s.id !== studentId) return s;

            const existing = s.attendance.find(
              (a) => a.moduleId === moduleId && a.date === date,
            );
            const module = state.modules.find((m) => m.id === moduleId);

            if (existing) {
              return {
                ...s,
                attendance: s.attendance.map((a) =>
                  a.moduleId === moduleId && a.date === date
                    ? { ...a, status }
                    : a,
                ),
              };
            }

            return {
              ...s,
              attendance: [
                ...s.attendance,
                {
                  id: uuidv4(),
                  studentId,
                  moduleId,
                  moduleName: module?.name || '',
                  date,
                  status,
                  markedAt: new Date().toISOString(),
                },
              ],
            };
          }),
        })),

      addPayment: (studentId, payment) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  payments: [...s.payments, { ...payment, id: uuidv4() }],
                }
              : s,
          ),
        })),

      updatePayment: (studentId, paymentId, data) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  payments: s.payments.map((p) =>
                    p.id === paymentId ? { ...p, ...data } : p,
                  ),
                }
              : s,
          ),
        })),

      addModule: (m) =>
        set((state) => ({
          modules: [...state.modules, { ...m, id: `m-${uuidv4()}`, videos: [] }],
        })),

      updateModule: (id, m) =>
        set((state) => ({
          modules: state.modules.map((x) =>
            x.id === id ? { ...x, ...m } : x,
          ),
        })),

      deleteModule: (id) =>
        set((state) => ({
          modules: state.modules.filter((x) => x.id !== id),
        })),

      addVideo: (v) =>
        set((state) => {
          const newVideo = { ...v, id: `v-${uuidv4()}` };

          return {
            videos: [...state.videos, newVideo],
            modules: state.modules.map((m) =>
              m.id === v.moduleId
                ? { ...m, videos: [...m.videos, newVideo] }
                : m,
            ),
          };
        }),

      deleteVideo: (id) =>
        set((state) => ({
          videos: state.videos.filter((v) => v.id !== id),
          modules: state.modules.map((m) => ({
            ...m,
            videos: m.videos.filter((v) => v.id !== id),
          })),
        })),

      addExam: (e) =>
        set((state) => ({
          exams: [...state.exams, { ...e, id: `e-${uuidv4()}` }],
        })),

      updateExam: (id, e) =>
        set((state) => ({
          exams: state.exams.map((x) => (x.id === id ? { ...x, ...e } : x)),
        })),

      deleteExam: (id) =>
        set((state) => ({
          exams: state.exams.filter((x) => x.id !== id),
        })),
    }),
    { name: 'edu-data' },
  ),
);
