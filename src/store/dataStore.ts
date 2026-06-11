import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Teacher, Student, Module, LectureVideo, PaymentRecord, Exam } from '../types';

function generateStudentId(batch: string): string {
  const existing = JSON.parse(localStorage.getItem('edu-data') || '{}')?.students || [];
  const batchStudents = existing.filter((s: Student) => s.batch === batch);
  const num = (batchStudents.length + 1).toString().padStart(4, '0');
  // e.g. "May 2024 Batch" -> "May24"
  const parts = batch.split(' ');
  const month = parts[0] || 'Jan';
  const year = parts[1] ? parts[1].slice(2) : '24';
  return `${month}${year}#${num}`;
}

const SAMPLE_MODULES: Module[] = [
  { id: 'm1', name: 'English', teacherId: 't1', teacherName: 'Ms. Sarah Johnson', description: 'Advanced English Language', duration: '6 months', fee: 5000, batch: 'May 2024 Batch', status: 'active', createdAt: '2024-05-01', videos: [] },
  { id: 'm2', name: 'Science', teacherId: 't2', teacherName: 'Mr. David Silva', description: 'Combined Science', duration: '6 months', fee: 6000, batch: 'May 2024 Batch', status: 'active', createdAt: '2024-05-01', videos: [] },
  { id: 'm3', name: 'Mathematics', teacherId: 't1', teacherName: 'Ms. Sarah Johnson', description: 'Advanced Mathematics', duration: '6 months', fee: 5500, batch: 'May 2024 Batch', status: 'active', createdAt: '2024-05-01', videos: [] },
];

const SAMPLE_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Ms. Sarah Johnson', email: 'sarah@eduadmin.com', phone: '+94771112222', subject: ['English', 'Mathematics'], qualification: 'B.Ed (English)', experience: '8 years', address: 'Colombo 03', joinDate: '2020-01-15', status: 'active' },
  { id: 't2', name: 'Mr. David Silva', email: 'david@eduadmin.com', phone: '+94773334444', subject: ['Science', 'Physics'], qualification: 'B.Sc (Physics)', experience: '5 years', address: 'Colombo 05', joinDate: '2021-03-01', status: 'active' },
];

const SAMPLE_STUDENTS: Student[] = [
  {
    id: 's1', studentId: 'May24#0001', qrToken: 'qr-s1-a1b2c3d4', name: 'Kasun Perera', email: 'kasun@gmail.com', phone: '+94 77 555 6666',
    address: 'Gampaha', dob: '2005-03-15', batch: 'May 2024 Batch', modules: ['m1', 'm2'],
    status: 'approved', enrolledAt: '2024-05-01', approvedAt: '2024-05-02',
    attendance: [
      { id: uuidv4(), studentId: 's1', moduleId: 'm1', moduleName: 'English', date: '2024-06-01', status: 'present', markedAt: '2024-06-01T09:00:00' },
      { id: uuidv4(), studentId: 's1', moduleId: 'm2', moduleName: 'Science', date: '2024-06-01', status: 'absent', markedAt: '2024-06-01T11:00:00' },
    ],
    payments: [
      { id: uuidv4(), studentId: 's1', studentName: 'Kasun Perera', moduleId: 'm1', moduleName: 'English', amount: 5000, paidDate: '2024-05-05', method: 'cash', status: 'paid', receiptNo: 'REC-001', batch: 'May 2024 Batch' },
    ],
  },
  {
    id: 's2', studentId: 'May24#0002', qrToken: 'qr-s2-e5f6g7h8', name: 'Nimasha Fernando', email: 'nimasha@gmail.com', phone: '+94 76 777 8888',
    address: 'Kandy', dob: '2006-07-22', batch: 'May 2024 Batch', modules: ['m1', 'm3'],
    status: 'pending', enrolledAt: '2024-05-10',
    attendance: [],
    payments: [],
  },
];

const SAMPLE_EXAMS: Exam[] = [
  { id: 'e1', title: 'Mid-Term English', moduleId: 'm1', moduleName: 'English', batch: 'May 2024 Batch', date: '2024-07-15', startTime: '09:00', endTime: '11:00', venue: 'Hall A', totalMarks: 100, status: 'upcoming', createdAt: '2024-06-01' },
  { id: 'e2', title: 'Science Term Test', moduleId: 'm2', moduleName: 'Science', batch: 'May 2024 Batch', date: '2024-07-18', startTime: '13:00', endTime: '15:00', venue: 'Hall B', totalMarks: 100, status: 'upcoming', createdAt: '2024-06-01' },
];

interface DataStore {
  teachers: Teacher[];
  students: Student[];
  modules: Module[];
  videos: LectureVideo[];
  exams: Exam[];
  // Teachers
  addTeacher: (t: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, t: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  // Students
  addStudent: (s: Omit<Student, 'id' | 'studentId' | 'qrToken' | 'attendance' | 'payments'>) => void;
  updateStudent: (id: string, s: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  approveStudent: (id: string) => void;
  updateAttendance: (studentId: string, moduleId: string, date: string, status: 'present' | 'absent') => void;
  addPayment: (studentId: string, payment: Omit<PaymentRecord, 'id'>) => void;
  updatePayment: (studentId: string, paymentId: string, data: Partial<PaymentRecord>) => void;
  // Modules
  addModule: (m: Omit<Module, 'id' | 'videos'>) => void;
  updateModule: (id: string, m: Partial<Module>) => void;
  deleteModule: (id: string) => void;
  addVideo: (v: Omit<LectureVideo, 'id'>) => void;
  deleteVideo: (id: string) => void;
  // Exams
  addExam: (e: Omit<Exam, 'id'>) => void;
  updateExam: (id: string, e: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
}

export const useDataStore = create<DataStore>()(
  persist(
    (set) => ({
      teachers: SAMPLE_TEACHERS,
      students: SAMPLE_STUDENTS,
      modules: SAMPLE_MODULES,
      videos: [],
      exams: SAMPLE_EXAMS,

      addTeacher: (t) => set(state => ({ teachers: [...state.teachers, { ...t, id: `t-${uuidv4()}` }] })),
      updateTeacher: (id, t) => set(state => ({ teachers: state.teachers.map(x => x.id === id ? { ...x, ...t } : x) })),
      deleteTeacher: (id) => set(state => ({ teachers: state.teachers.filter(x => x.id !== id) })),

      addStudent: (s) => set(state => {
        const id = `s-${uuidv4()}`;
        const studentId = generateStudentId(s.batch);
        const qrToken = `qr-${uuidv4()}`;
        return { students: [...state.students, { ...s, id, studentId, qrToken, attendance: [], payments: [] }] };
      }),
      updateStudent: (id, s) => set(state => ({ students: state.students.map(x => x.id === id ? { ...x, ...s } : x) })),
      deleteStudent: (id) => set(state => ({ students: state.students.filter(x => x.id !== id) })),
      approveStudent: (id) => set(state => ({
        students: state.students.map(x => x.id === id ? { ...x, status: 'approved', approvedAt: new Date().toISOString() } : x)
      })),
      updateAttendance: (studentId, moduleId, date, status) => set(state => ({
        students: state.students.map(s => {
          if (s.id !== studentId) return s;
          const existing = s.attendance.find(a => a.moduleId === moduleId && a.date === date);
          const module = state.modules.find(m => m.id === moduleId);
          if (existing) {
            return { ...s, attendance: s.attendance.map(a => a.moduleId === moduleId && a.date === date ? { ...a, status } : a) };
          }
          return {
            ...s, attendance: [...s.attendance, {
              id: uuidv4(), studentId, moduleId, moduleName: module?.name || '', date, status, markedAt: new Date().toISOString()
            }]
          };
        })
      })),
      addPayment: (studentId, payment) => set(state => ({
        students: state.students.map(s => s.id === studentId ? { ...s, payments: [...s.payments, { ...payment, id: uuidv4() }] } : s)
      })),
      updatePayment: (studentId, paymentId, data) => set(state => ({
        students: state.students.map(s => s.id === studentId
          ? { ...s, payments: s.payments.map(p => p.id === paymentId ? { ...p, ...data } : p) }
          : s
        )
      })),

      addModule: (m) => set(state => ({ modules: [...state.modules, { ...m, id: `m-${uuidv4()}`, videos: [] }] })),
      updateModule: (id, m) => set(state => ({ modules: state.modules.map(x => x.id === id ? { ...x, ...m } : x) })),
      deleteModule: (id) => set(state => ({ modules: state.modules.filter(x => x.id !== id) })),
      addVideo: (v) => set(state => {
        const newVideo = { ...v, id: `v-${uuidv4()}` };
        return {
          videos: [...state.videos, newVideo],
          modules: state.modules.map(m => m.id === v.moduleId ? { ...m, videos: [...m.videos, newVideo] } : m)
        };
      }),
      deleteVideo: (id) => set(state => ({
        videos: state.videos.filter(v => v.id !== id),
        modules: state.modules.map(m => ({ ...m, videos: m.videos.filter(v => v.id !== id) }))
      })),

      addExam: (e) => set(state => ({ exams: [...state.exams, { ...e, id: `e-${uuidv4()}` }] })),
      updateExam: (id, e) => set(state => ({ exams: state.exams.map(x => x.id === id ? { ...x, ...e } : x) })),
      deleteExam: (id) => set(state => ({ exams: state.exams.filter(x => x.id !== id) })),
    }),
    { name: 'edu-data' }
  )
);
