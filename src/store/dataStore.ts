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
  rejectStudent as rejectStudentRequest,
  createStudent,
  deleteStudent as deleteStudentRequest,
  getStudents,
  updateStudent as updateStudentRequest,
} from '../api/studentApi';
import type { CreateStudentRequestPayload } from '../api/studentApi';
import { cleanOlResults, normalizeAlSubjects } from '../utils/studentPayload';

function getSelectedSubjects(s: any): string[] {
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
    return s.subjectSelection.enrolledModules;
  }
  if (Array.isArray(s.enrolledModules) && s.enrolledModules.length > 0) {
    return s.enrolledModules;
  }
  return [];
}

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

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;

    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    }
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
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
    phone: '+94771112222',
    subject: ['English', 'Mathematics'],
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
    phone: '+94773334444',
    subject: ['Science', 'Physics'],
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
  rejectStudent: (id: string, reason: string) => Promise<void>;

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
  const selectedSubjects = getSelectedSubjects(s);
  const displayName = s.fullNameEnglish || s.name || s.email || '';

  return {
    id: s._id || s.id,
    studentId: s.studentId || '',
    qrToken: s.qrToken || '',
    name: displayName,
    email: s.email || '',
    phone: s.phone || s.whatsappNo || '',
    address: s.address || s.permanentAddress || '',
    dob: s.dob || s.dateOfBirth || '',
    batch: s.batch || '',
    modules: selectedSubjects,
    subjects: selectedSubjects,
    status: s.status || 'pending',
    avatar: s.avatar || s.profilePhoto,
    parentName: s.parentName || s.guardianName,
    parentPhone: s.parentPhone || s.parentsNo || s.guardianMobile,
    enrolledAt: s.enrolledAt || s.createdAt || new Date().toISOString(),
    approvedAt: s.approvedAt,
    attendance: s.attendance || [],
    payments: s.payments || [],
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
    declarationAccepted: s.declarationAccepted,
    qrCodeUrl: s.qrCodeUrl,
    qrImageKey: s.qrImageKey,
  } as Student;
}

function mapRaceToBackend(race?: string): string | undefined {
  if (!race) return undefined;

  const raceMap: Record<string, string> = {
    'Sri Lankan Tamil': 'Tamil',
    'Indian Tamil': 'Tamil',
  };

  return raceMap[race] || race;
}

function mapReligionToBackend(religion?: string): string | undefined {
  if (!religion) return undefined;

  const religionMap: Record<string, string> = {
    Christianity: 'Christianity(RC/Non.RC)',
    Catholicism: 'Christianity(RC/Non.RC)',
  };

  return religionMap[religion] || religion;
}

function mapStudentToCreatePayload(
  s: Omit<Student, 'id' | 'studentId' | 'qrToken' | 'attendance' | 'payments'>,
  modules: Module[],
): CreateStudentRequestPayload {
  const selectedSubjects = getSelectedSubjects(s);
  const fullNameEnglish = s.fullNameEnglish?.trim() || s.name?.trim() || '';
  const dob = s.dob?.trim() || s.dateOfBirth?.trim();

  return {
    name: fullNameEnglish,
    fullNameEnglish,
    fullNameTamil: s.fullNameTamil?.trim(),

    email: s.email.trim(),
    phone: s.whatsappNo?.trim() || s.phone?.trim() || '',

    whatsappNo: s.whatsappNo?.trim(),
    parentsNo: s.parentsNo?.trim(),

    batch: s.batch.trim(),

    modules: selectedSubjects,
    subjects: selectedSubjects,

    address: s.address?.trim(),
    permanentAddress: s.permanentAddress?.trim(),
    contactAddress: s.contactAddress?.trim(),

    administrativeDistrict: s.administrativeDistrict?.trim(),
    postalCode: s.postalCode?.trim(),

    dob,
    dateOfBirth: dob,

    nicNo: s.nicNo?.trim(),
    school: s.school?.trim(),

    parentName:
      s.motherName?.trim() ||
      s.fatherName?.trim() ||
      s.guardianName?.trim() ||
      s.parentName?.trim(),

    parentPhone:
      s.parentsNo?.trim() ||
      s.guardianMobile?.trim() ||
      s.parentPhone?.trim(),

    fatherName: s.fatherName?.trim(),
    motherName: s.motherName?.trim(),
    guardianName: s.guardianName?.trim(),

    guardianMobile: s.guardianMobile?.trim(),
    guardianAddress: s.guardianAddress?.trim(),
    guardianFixedTel: s.guardianFixedTel?.trim(),

    fixedTelephone: s.fixedTelephone?.trim(),
    residingSince: s.residingSince?.trim(),

    race: mapRaceToBackend(s.race),
    religion: mapReligionToBackend(s.religion),
    citizenByDescent: s.citizenByDescent,

    contactPerson: s.contactPerson,

    olCategory: s.olCategory,
    olYear: s.olYear,
    olIndexNumber: s.olIndexNumber,
    olNameUsed: s.olNameUsed,
    olAccept: s.olAccept,
    olResults: cleanOlResults(s.olResults || []),

    password: s.password?.trim() || '',
  } as CreateStudentRequestPayload;
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
          const response = await getStudents();

          const studentsArray = Array.isArray(response)
            ? response
            : Array.isArray((response as any)?.data)
              ? (response as any).data
              : Array.isArray((response as any)?.students)
                ? (response as any).students
                : Array.isArray((response as any)?.data?.students)
                  ? (response as any).data.students
                  : [];

          set({ students: studentsArray.map(mapBackendStudent) });
        } catch (error) {
          console.error('Failed to fetch students:', error);
          set({ students: [] });
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
          const created = await createStudent(
            mapStudentToCreatePayload(s, get().modules),
          );

          const mapped = created
            ? mapBackendStudent(created)
            : buildLocalStudentFallback(s);

          set((state) => ({
            students: [...state.students, mapped],
          }));
        } catch (error) {
          throw new Error(getApiErrorMessage(error, 'Failed to add student'));
        }
      },

      updateStudent: async (id, s) => {
        try {
          const selectedSubjects = getSelectedSubjects(s);

          const payload = {
            ...s,
            ...(selectedSubjects.length > 0
              ? {
                  modules: selectedSubjects,
                  subjects: selectedSubjects,
                }
              : {}),
          };

          const updated = await updateStudentRequest(id, payload);

          set((state) => ({
            students: state.students.map((x) =>
              x.id === id
                ? mapBackendStudent(updated || { ...x, ...payload, _id: id })
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
          const student = get().students.find((x) => x.id === id);

          if (student) {
            const fixPayload: Record<string, any> = {};

            const validRaces = [
              'Sinhala',
              'Tamil',
              'Muslim',
              'Burgher',
              'Malay',
              'Other',
            ];

            if (student.race && !validRaces.includes(student.race)) {
              fixPayload.race = mapRaceToBackend(student.race);
            }

            const validReligions = [
              'Buddhism',
              'Hinduism',
              'Islam',
              'Christianity(RC/Non.RC)',
              'Other',
            ];

            if (student.religion && !validReligions.includes(student.religion)) {
              fixPayload.religion = mapReligionToBackend(student.religion);
            }

            if (student.olResults && student.olResults.length > 0) {
              fixPayload.olResults = cleanOlResults(student.olResults);
            }

            if (Object.keys(fixPayload).length > 0) {
              await updateStudentRequest(id, fixPayload);
            }
          }

          const approved = await approveStudentRequest(id);

          set((state) => ({
            students: state.students.map((x) => {
              if (x.id !== id) return x;

              if (approved) {
                return mapBackendStudent(approved);
              }

              return {
                ...x,
                status: 'approved' as const,
                approvedAt: new Date().toISOString(),
              };
            }),
          }));
        } catch (error) {
          console.error('Failed to approve student:', error);
          const msg = getApiErrorMessage(error, 'Failed to approve student');
          throw new Error(msg);
        }
      },

      rejectStudent: async (id, reason) => {
        try {
          const rejected: any = await rejectStudentRequest(id, reason);

          set((state) => ({
            students: state.students.map((x) => {
              if (x.id !== id) return x;

              return {
                ...x,
                status: 'rejected' as const,
                ...(rejected?.rejectionReason
                  ? { rejectionReason: rejected.rejectionReason }
                  : {}),
              };
            }),
          }));
        } catch (error) {
          console.error('Failed to reject student:', error);
          const msg = getApiErrorMessage(error, 'Failed to reject student');
          throw new Error(msg);
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
                  moduleName: module?.name || moduleId,
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
    {
      name: 'edu-data',
      partialize: (state) => ({
        teachers: state.teachers,
        modules: state.modules,
        videos: state.videos,
        exams: state.exams,
      }),
    },
  ),
);