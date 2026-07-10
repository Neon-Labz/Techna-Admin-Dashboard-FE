import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const authData = localStorage.getItem('edu-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Ignore malformed auth data
    }
  }
  return config;
});

export type Announcement = {
  _id?: string;
  id?: string;
  title: string;
  date: string;
  audience: 'All Students';
  batch?: string;
  content: string;
  author?: string;
  createdAt?: string;
};

type StudentBatchSource = {
  batch?: string;
  batchName?: string;
  enrolledBatch?: string;
  currentBatch?: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const unwrapData = <T,>(responseData: ApiResponse<T> | T): T => {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData
  ) {
    return (responseData as ApiResponse<T>).data;
  }

  return responseData as T;
};

const uniqueBatchesFromStudents = (students: StudentBatchSource[]): string[] =>
  Array.from(
    new Set(
      students
        .map(
          (student) =>
            student.batch ||
            student.batchName ||
            student.enrolledBatch ||
            student.currentBatch ||
            '',
        )
        .map((batch) => batch.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

export const announcementApi = {
  getAll: async (): Promise<Announcement[]> => {
    const res = await api.get<ApiResponse<Announcement[]>>('/announcements');
    return unwrapData<Announcement[]>(res.data);
  },

  create: async (payload: Announcement) => {
    const res = await api.post<ApiResponse<Announcement>>('/announcements', payload);
    return unwrapData<Announcement>(res.data);
  },

  update: async (id: string, payload: Partial<Announcement>) => {
    const res = await api.patch<ApiResponse<Announcement>>(`/announcements/${id}`, payload);
    return unwrapData<Announcement>(res.data);
  },

  remove: async (id: string) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/announcements/${id}`);
    return unwrapData<{ message: string }>(res.data);
  },

  getBatches: async (): Promise<string[]> => {
    try {
      const res = await api.get<ApiResponse<string[]> | string[]>('/students/batches');
      return unwrapData<string[]>(res.data);
    } catch {
      const res = await api.get<ApiResponse<StudentBatchSource[]> | StudentBatchSource[]>('/students');
      return uniqueBatchesFromStudents(unwrapData<StudentBatchSource[]>(res.data));
    }
  },
};
