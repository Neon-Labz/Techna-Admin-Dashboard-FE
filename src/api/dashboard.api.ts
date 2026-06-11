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
<<<<<<< HEAD

=======
async getRevenue() {
  const { data } = await api.get('/dashboard/revenue');
  return data.data || data;
},
>>>>>>> 21b080288ba7facd7d2452e17539aea4791ffc83

};