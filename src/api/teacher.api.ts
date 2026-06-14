import { apiClient } from './axiosClient';

export interface TeacherFromApi {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  qualification: string;
  experience: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherPayload {
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  qualification: string;
  experience: string;
  address: string;
  joinDate: string;
  status?: 'active' | 'inactive';
  password?: string;
}

export const teacherApi = {
  getAll: () => apiClient<TeacherFromApi[]>('/teachers'),
  create: (payload: TeacherPayload) =>
    apiClient<TeacherFromApi>('/teachers', {
      method: 'POST',
      body: payload,
    }),
  update: (id: string, payload: Partial<TeacherPayload>) =>
    apiClient<TeacherFromApi>(`/teachers/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
  delete: (id: string) =>
    apiClient<{ message: string }>(`/teachers/${id}`, {
      method: 'DELETE',
    }),
};
