import axiosInstance from '@/lib/axios';

export const examApi = {
  getAll: () => axiosInstance.get('/exam-notices'),

  getById: (id: string) =>
    axiosInstance.get(`/exam-notices/${id}`),

  create: (data: any) =>
    axiosInstance.post('/exam-notices', data),

  update: (id: string, data: any) =>
    axiosInstance.patch(`/exam-notices/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`/exam-notices/${id}`),
};