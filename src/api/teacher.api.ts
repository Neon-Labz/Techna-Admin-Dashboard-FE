import { apiClient, getStoredToken } from './axiosClient';

export interface TeacherFromApi {
  _id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  gender?: 'male' | 'female' | '';
  subject: string | string[];
  qualification?: string;
  experience: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive';
  photoUrl?: string;
  photoKey?: string;
  degree?: string[];
  specializations?: string[];
  awards?: string[];
  achievements?: string[];
  biography?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTeacherPayload {
  fullName: string;
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
  degree?: string[];
  specializations?: string[];
  awards?: string[];
  achievements?: string[];
  biography?: string;
}

export type UpdateTeacherPayload = Partial<CreateTeacherPayload>;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function uploadTeacherPhoto(
  id: string,
  file: File,
): Promise<TeacherFromApi> {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`${API_BASE_URL}/teachers/${id}/upload-photo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to upload photo');
  }

  const json = await response.json() as { data?: TeacherFromApi } | TeacherFromApi;
  return (json as { data?: TeacherFromApi }).data ?? (json as TeacherFromApi);
}

export const teacherApi = {
  getAll: () => apiClient<TeacherFromApi[]>('/teachers'),

  create: (data: CreateTeacherPayload) =>
    apiClient<TeacherFromApi>('/teachers', {
      method: 'POST',
      body: { ...data, password: 'Teacher@123' },
    }),

  update: (id: string, data: UpdateTeacherPayload) =>
    apiClient<TeacherFromApi>(`/teachers/${id}`, {
      method: 'PATCH',
      body: { ...data },
    }),

  delete: (id: string) =>
    apiClient<{ message: string }>(`/teachers/${id}`, {
      method: 'DELETE',
    }),

  uploadPhoto: uploadTeacherPhoto,

  removePhoto: (id: string) =>
    apiClient<TeacherFromApi>(`/teachers/${id}/photo`, { method: 'DELETE' }),
};
