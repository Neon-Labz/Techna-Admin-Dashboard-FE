import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// ─── Backend response types ────────────────────────────────────────────────────
// These reflect the exact MongoDB/Mongoose document shapes returned by Techna-BE.
// All documents carry _id (Mongo ObjectId serialised as string) plus timestamps.

export interface ApiResource {
  _id: string;
  title: string;
  fileType: 'video' | 'image' | 'pdf' | 'file';
  fileUrl: string;
  fileKey: string;
  url?: string;
  thumbnailUrl?: string;
  description?: string;
  uploadedAt?: string;
  isPublished?: boolean;
}

export interface ApiModule {
  _id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  description: string;
  duration: string;
  fee: number;
  batch: string;
  status: 'active' | 'inactive';
  term?: string;
  unit?: number;
  subjectCategory?: 'main' | 'basket' | 'none';
  resources: ApiResource[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiTeacher {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string | string[];
  qualification: string;
  experience: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ApiStudent {
  _id: string;
  studentId: string;
  qrToken: string;
  qrCode?: string;
  email: string;
  phone: string;
  batch: string;
  modules: string[];
  status: 'pending' | 'approved' | 'rejected';
  enrolledAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  avatar?: string;
  address?: string;
  dob?: string;
  parentName?: string;
  parentPhone?: string;
  fullNameEnglish?: string;
  fullNameTamil?: string;
  school?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiVideo {
  _id: string;
  title: string;
  moduleId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  s3Key?: string;
  duration?: string;
  batch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAttendance {
  _id: string;
  studentId: string;
  moduleId: string;
  moduleName: string;
  date: string;
  status: 'present' | 'absent';
  markedAt: string;
  sessionDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Request DTOs ──────────────────────────────────────────────────────────────

export interface CreateModuleDto {
  name: string;
  teacherId: string;
  teacherName: string;
  description: string;
  duration: string;
  fee: number;
  batch: string;
  status?: 'active' | 'inactive';
  term?: string;
  unit?: number;
  subjectCategory?: 'main' | 'basket' | 'none';
}

export interface UpdateModuleDto {
  name?: string;
  teacherId?: string;
  teacherName?: string;
  description?: string;
  duration?: string;
  fee?: number;
  batch?: string;
  status?: 'active' | 'inactive';
  term?: string;
  unit?: number;
  subjectCategory?: 'main' | 'basket' | 'none';
}

export interface CreateVideoDto {
  title: string;
  moduleId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  s3Key?: string;
  duration?: string;
  batch?: string;
}

export interface UpdateAttendanceDto {
  status?: 'present' | 'absent';
  date?: string;
  markedAt?: string;
}

export interface VideoFilters {
  moduleId?: string;
  batch?: string;
}

export interface AttendanceFilters {
  studentId?: string;
  moduleId?: string;
  date?: string;
  sessionDate?: string;
}

// ─── Axios instance ────────────────────────────────────────────────────────────

// Every call site in this file already prefixes its path with '/api/'
// (e.g. api.get('/api/modules')), so the baseURL must be the bare host —
// strip a trailing '/api' from the shared env var to avoid '/api/api/...'.
const API_HOST = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000/api').replace(/\/api\/?$/, '');

const api: AxiosInstance = axios.create({
  baseURL: API_HOST,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    // Read token from the Zustand persisted auth store ('edu-auth' key)
    try {
      const stored = localStorage.getItem('edu-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Unwrap the global { success, message, data, timestamp, path } envelope
    // that ResponseInterceptor adds to every 2xx response in Techna-BE.
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== 'undefined'
    ) {
      localStorage.removeItem('edu-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface ApiPayment {
  _id: string;
  studentId: string;
  studentName?: string;
  moduleId?: string;
  moduleName?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'partial';
  notes?: string;
  createdAt: string;
}

export const createPayment = (data: Partial<ApiPayment>): Promise<ApiPayment> =>
  api.post<ApiPayment>('/api/payments', data).then((r) => r.data);

export const updatePayment = (id: string, data: Partial<ApiPayment>): Promise<ApiPayment> =>
  api.patch<ApiPayment>(`/api/payments/${id}`, data).then((r) => r.data);

// ─── Modules ───────────────────────────────────────────────────────────────────

export const getModules = (status?: string): Promise<ApiModule[]> =>
  api.get<ApiModule[]>('/api/modules', { params: status ? { status } : undefined }).then((r) => r.data);

export const getModuleById = (id: string): Promise<ApiModule> =>
  api.get<ApiModule>(`/api/modules/${id}`).then((r) => r.data);

export const createModule = (data: CreateModuleDto): Promise<ApiModule> =>
  api.post<ApiModule>('/api/modules', data).then((r) => r.data);

export const updateModule = (id: string, data: UpdateModuleDto): Promise<ApiModule> =>
  api.patch<ApiModule>(`/api/modules/${id}`, data).then((r) => r.data);

export const deleteModule = (id: string): Promise<{ message: string }> =>
  api.delete<{ message: string }>(`/api/modules/${id}`).then((r) => r.data);

// ─── Teachers ──────────────────────────────────────────────────────────────────

export const getTeachers = (status?: string): Promise<ApiTeacher[]> =>
  api.get<ApiTeacher[]>('/api/teachers', { params: status ? { status } : undefined }).then((r) => r.data);

// ─── Students ──────────────────────────────────────────────────────────────────

export const getStudents = (): Promise<ApiStudent[]> =>
  api.get<ApiStudent[]>('/api/students').then((r) => r.data);

// ─── Videos ────────────────────────────────────────────────────────────────────

export const getVideos = (filters?: VideoFilters): Promise<ApiVideo[]> =>
  api.get<ApiVideo[]>('/api/videos', { params: filters }).then((r) => r.data);

export const createVideo = (data: CreateVideoDto): Promise<ApiVideo> =>
  api.post<ApiVideo>('/api/videos', data).then((r) => r.data);

// ─── Attendance ────────────────────────────────────────────────────────────────

export const getAttendance = (filters?: AttendanceFilters): Promise<ApiAttendance[]> =>
  api.get<ApiAttendance[]>('/api/attendance', { params: filters }).then((r) => r.data);

export const updateAttendance = (id: string, data: UpdateAttendanceDto): Promise<ApiAttendance> =>
  api.patch<ApiAttendance>(`/api/attendance/${id}`, data).then((r) => r.data);

export const deleteAttendance = (id: string): Promise<{ message: string }> =>
  api.delete<{ message: string }>(`/api/attendance/${id}`).then((r) => r.data);

// ─── Module Resources ──────────────────────────────────────────────────────────

export const uploadModuleResource = (
  moduleId: string,
  formData: FormData
): Promise<ApiResource> =>
  api.post<ApiResource>(`/api/modules/${moduleId}/upload-resource`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const addResourceUrl = (
  moduleId: string,
  data: {
    title: string;
    url: string;
    thumbnailUrl?: string;
    fileType: string;
    description?: string;
  }
): Promise<ApiResource> =>
  api.post(`/api/modules/${moduleId}/add-resource-url`, data)
    .then(r => r.data);

export const syncResourcesWithR2 = (): Promise<{
  checked: number;
  removed: number;
  message: string;
}> => api.post('/api/modules/sync-r2').then((r) => r.data);

export const toggleResourcePublish = (
  moduleId: string,
  resourceId: string
): Promise<{ resourceId: string; isPublished: boolean; message: string }> =>
  api.patch(`/api/modules/${moduleId}/resources/${resourceId}/toggle-publish`)
    .then(r => r.data);

// ─── Attendance (create) ───────────────────────────────────────────────────────

export interface CreateAttendanceDto {
  studentId: string;
  moduleId: string;
  moduleName: string;
  date: string;
  status: 'present' | 'absent';
  markedAt: string;
}

export const createAttendance = (data: CreateAttendanceDto): Promise<ApiAttendance> =>
  api.post<ApiAttendance>('/api/attendance', data).then(r => r.data);

export const getStudentAttendance = (
  studentId: string
): Promise<ApiAttendance[]> =>
  api.get(`/api/attendance/student/${studentId}`).then(r => r.data);

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

// Re-export for use in components without importing axios directly
export { isAxiosError } from 'axios';

export { apiClient as apiRequest, getStoredToken } from '../api/axiosClient';
export { authApi } from '../api/auth.api';