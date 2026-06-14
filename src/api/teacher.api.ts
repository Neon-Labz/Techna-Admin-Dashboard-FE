import { apiClient } from './axiosClient';

// Shape returned by the backend (MongoDB document without password)
export interface TeacherFromApi {
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
  createdAt?: string;
  updatedAt?: string;
}

// Payload for creating a teacher
export interface CreateTeacherPayload {
  fullName: string;
  email: string;
  phone: string;
  subject: string[];
  qualification: string;
  experience: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

// Payload for updating a teacher (all fields optional)
export type UpdateTeacherPayload = Partial<CreateTeacherPayload>;

/** Convert the payload for backend – join subject array as comma-separated string */
function toApiBody(data: CreateTeacherPayload | UpdateTeacherPayload) {
  const { subject, ...rest } = data;
  return {
    ...rest,
    ...(subject !== undefined ? { subject: subject.join(', ') } : {}),
  };
}

export const teacherApi = {
  /** GET /api/teachers – fetch all teachers */
  getAll: () => apiClient<TeacherFromApi[]>('/teachers'),

  /** POST /api/teachers – create a new teacher */
  create: (data: CreateTeacherPayload) =>
    apiClient<TeacherFromApi>('/teachers', { method: 'POST', body: { ...toApiBody(data), password: 'Teacher@123' } }),

  /** PATCH /api/teachers/:id – update a teacher */
  update: (id: string, data: UpdateTeacherPayload) =>
    apiClient<TeacherFromApi>(`/teachers/${id}`, { method: 'PATCH', body: toApiBody(data) }),

  /** DELETE /api/teachers/:id – delete a teacher */
  delete: (id: string) =>
    apiClient<{ message: string }>(`/teachers/${id}`, { method: 'DELETE' }),
};
