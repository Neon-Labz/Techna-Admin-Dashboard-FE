import api from '@/lib/axios';

const getData = async (url: string, fallback: any) => {
  try {
    const res: any = await api.get(url);
    const payload = res?.data !== undefined ? res.data : res;
    return payload?.data || payload || fallback;
  } catch (err: any) {
    if (err?.response?.status === 401) {
console.warn(`Unauthorized: ${url}`);
      return fallback;
    }

    console.error(`${url} failed:`, err);
    return fallback;
  }
};

export const dashboardApi = {
  getSummary() {
    return getData('/dashboard/summary', {});
  },

  getTeachers() {
    return getData('/teachers', []);
  },

  getModules() {
    return getData('/modules', []);
  },

  getExams() {
    return getData('/exam-notices', []);
  },

  getStudents() {
    return getData('/students', []);
  },

  getRevenue() {
    return getData('/dashboard/revenue', []);
  },

  getPayments() {
    return getData('/payments', []);
  },
};