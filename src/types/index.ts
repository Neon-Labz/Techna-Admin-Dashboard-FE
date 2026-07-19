export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  avatar?: string;
  phone?: string;
  createdAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  gender?: 'male' | 'female' | '';
  subject: string[];
  qualification?: string;
  experience: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive';
  avatar?: string;
  photoUrl?: string;
  degree?: string[];
  specializations?: string[];
  awards?: string[];
  achievements?: string[];
  biography?: string;
}

export interface Module {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  description: string;
  duration: string;
  fee: number;
  batch: string;
  status: 'active' | 'inactive';
  createdAt: string;
  videos: LectureVideo[];
}

export interface LectureVideo {
  id: string;
  title: string;
  moduleId: string;
  moduleName: string;
  batch: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  s3Key?: string;
  uploadedAt: string;
  duration?: string;
}

export interface Student {
  id: string;
  studentId: string;
  qrToken: string;
  qrCodeUrl?: string;
  qrImageKey?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  dateOfBirth?: string;
  batch: string;
  modules: string[];
  status: 'pending' | 'approved' | 'rejected';
  avatar?: string;
  parentName?: string;
  parentPhone?: string;
  enrolledAt: string;
  approvedAt?: string;
  attendance: AttendanceRecord[];
  payments: PaymentRecord[];
  password?: string;
  fullNameTamil?: string;
  fullNameEnglish?: string;
  nicNo?: string;
  school?: string;
  whatsappNo?: string;
  parentsNo?: string;
  permanentAddress?: string;
  administrativeDistrict?: string;
  fixedTelephone?: string;
  residingSince?: string;
  race?: string;
  religion?: string;
  citizenByDescent?: string;
  contactAddress?: string;
  postalCode?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  contactPerson?: string;
  guardianAddress?: string;
  guardianFixedTel?: string;
  guardianMobile?: string;
  olCategory?: string;
  olYear?: string;
  olIndexNumber?: string;
  olNameUsed?: string;
  olAccept?: string;
  olResults?: OLResult[];
  subjects?: string[];
  subjectSelection?: {
    subjects?: string[];
    enrolledModules?: string[];
  };
  enrolledModules?: string[];
  declarationAccepted?: boolean;
}

export interface OLResult {
  year: string;
  indexNumber: string;
  english: string;
  mathematics: string;
  science: string;
  sinhala: string;
  tamil: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  moduleId: string;
  moduleName: string;
  date: string;
  status: 'present' | 'absent';
  markedAt: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  // Admission Fee / ID Card Fee payments are one-time fees with no real
  // Module record behind them, so moduleId is optional — only 'subject'
  // feeType payments are guaranteed to have one.
  moduleId?: string;
  moduleName: string;
  // 'subject'   -> recurring fee tied to a real Module (has moduleId)
  // 'admission' | 'idcard' -> one-time fee, no moduleId
  feeType?: 'subject' | 'admission' | 'idcard' | 'handout' | 'other';
  amount: number;
  paidDate: string;
  method: 'cash' | 'bank' | 'online';
  status: 'paid' | 'pending' | 'overdue';
  receiptNo: string;
  batch: string;
}

export interface Exam {
  id: string;
  title: string;
  moduleId: string;
  moduleName: string;
  batch: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  description?: string;
  totalMarks: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}