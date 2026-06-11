import { apiClient } from './axiosClient';

// Shape returned by the backend (MongoDB document without password)
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

export const teacherApi = {
  /** GET /api/teachers – fetch all teachers */
  getAll: () => apiClient<TeacherFromApi[]>('/teachers'),
};
