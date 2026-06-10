import axiosInstance from '@/lib/axios';

export const dashboardApi = {
  getSummary: () => axiosInstance.get('/dashboard/summary'),
};