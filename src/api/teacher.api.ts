import { apiClient } from './axiosClient';

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

export type UpdateTeacherPayload = Partial<CreateTeacherPayload>;

function toApiBody(data: CreateTeacherPayload | UpdateTeacherPayload) {
  const { subject, ...rest } = data;

  return {
    ...rest,
    ...(subject !== undefined
      ? { subject: Array.isArray(subject) ? subject.join(', ') : subject }
      : {}),
  };
}

export const teacherApi = {
  getAll: () => apiClient<TeacherFromApi[]>('/teachers'),

  create: (data: CreateTeacherPayload) =>
    apiClient<TeacherFromApi>('/teachers', {
      method: 'POST',
      body: { ...toApiBody(data), password: 'Teacher@123' },
    }),

  update: (id: string, data: UpdateTeacherPayload) =>
    apiClient<TeacherFromApi>(`/teachers/${id}`, {
      method: 'PATCH',
      body: toApiBody(data),
    }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/teachers/${id}`, {
      method: 'DELETE',
    }),
};