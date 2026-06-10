import axiosInstance from '@/lib/axios';

export const studentApi = {
  getAll: () => axiosInstance.get('/students'),
};