import { apiClient, getStoredToken } from './axiosClient';

export interface TeacherFromApi {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  gender?: 'male' | 'female' | '';
  subject: string | string[];
  qualification: string;
  experience: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive';
  photoUrl?: string;
  photoKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTeacherPayload {
  fullName: string;
  email: string;
  phone: string;
  gender?: 'male' | 'female' | '';
  subject: string[];
  qualification: string;
  experience: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

export type UpdateTeacherPayload = Partial<CreateTeacherPayload>;

function toApiBody(data: CreateTeacherPayload | UpdateTeacherPayload) {
  const { subject, gender, ...rest } = data;

  return {
    ...rest,
    ...(subject !== undefined
      ? { subject: Array.isArray(subject) ? subject.join(', ') : subject }
      : {}),
    // Only send gender when a real value is selected. This avoids sending an
    // empty string that backend enum/whitelist validation might reject, and
    // keeps the request compatible with backends that don't define gender.
    ...(gender ? { gender } : {}),
  };
}

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
    throw new Error(err.message || 'Failed to upload photo');
  }

  const json = await response.json();
  return json?.data ?? json;
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

  uploadPhoto: uploadTeacherPhoto,
};