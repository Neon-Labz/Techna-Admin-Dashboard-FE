import api from '@/lib/axios';

export const dashboardApi = {
  async getSummary() {
    try {
      const res: any = await api.get('/dashboard/summary');
      const payload = res?.data !== undefined ? res.data : res;
      return payload?.data || payload || {};
    } catch (err) {
      console.error('getSummary failed:', err);
      return {};
    }
  },

  async getTeachers() {
    try {
      const res: any = await api.get('/teachers');
      const payload = res?.data !== undefined ? res.data : res;
      return payload?.data || payload || [];
    } catch (err) {
      console.error('getTeachers failed:', err);
      return [];
    }
  },

  async getModules() {
    try {
      const res: any = await api.get('/modules');
      const payload = res?.data !== undefined ? res.data : res;
      return payload?.data || payload || [];
    } catch (err) {
      console.error('getModules failed:', err);
      return [];
    }
  },

  async getExams() {
    try {
      const res: any = await api.get('/exam-notices');
      const payload = res?.data !== undefined ? res.data : res;
      return payload?.data || payload || [];
    } catch (err) {
      console.error('getExams failed:', err);
      return [];
    }
  },

  async getStudents() {
    try {
      const res: any = await api.get('/students');
      const payload = res?.data !== undefined ? res.data : res;
      return payload?.data || payload || [];
    } catch (err) {
      console.error('getStudents failed:', err);
      return [];
    }
  },

  async getRevenue() {
    try {
      const res: any = await api.get('/dashboard/revenue');
      const payload = res?.data !== undefined ? res.data : res;
      return payload?.data || payload || [];
    } catch (err) {
      console.error('getRevenue failed:', err);
      return [];
    }
  },

  async getPayments() {
    try {
      const res: any = await api.get('/payments');
      const payload = res?.data !== undefined ? res.data : res;
      return payload?.data || payload || [];
    } catch (err) {
      console.error('getPayments failed:', err);
      return [];
    }
  },
};
