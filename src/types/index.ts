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
  email: string;
  phone: string;
  subject: string;
  qualification: string;
  experience: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive';
  avatar?: string;
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
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
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
  moduleId: string;
  moduleName: string;
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
