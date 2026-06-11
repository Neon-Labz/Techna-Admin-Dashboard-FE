import api from '@/lib/axios';

export const dashboardApi = {
  async getSummary() {
    const { data } = await api.get('/dashboard/summary');
    return data.data || data;
  },

  async getTeachers() {
    const { data } = await api.get('/teachers');
    return data.data || data;
  },

  async getModules() {
    const { data } = await api.get('/modules');
    return data.data || data;
  },

  async getExams() {
    const { data } = await api.get('/exam-notices');
    return data.data || data;
  },
  async getStudents() {
  const { data } = await api.get('/students');
  return data.data || data;
},


};