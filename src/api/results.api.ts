import api from '@/lib/axios';

const getArray = (res: any) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.students)) return res.students;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const getObject = (res: any) => {
  if (res?.data && !Array.isArray(res.data)) return res.data;
  return res;
};

export const resultsApi = {
  getStudents: async () => {
    const res = await api.get('/students?status=approved');

    const students = getArray(res);

    return students.map((s: any) => ({
      _id: s._id,
      id: s.id,
      studentId: s.studentId,
      fullNameEnglish: s.fullNameEnglish || s.name || '',
      name: s.name || s.fullNameEnglish || '',
      batch: s.batch || '',
    }));
  },

  getAll: async () => {
    const res = await api.get('/results');
    return getArray(res);
  },

  getStudentModules: async (studentId: string) => {
    const res = await api.get(`/results/student/${studentId}/modules`);
    return getObject(res);
  },

  create: async (payload: any) => {
    const res = await api.post('/results', payload);
    return getObject(res);
  },

  update: async (id: string, payload: any) => {
    const res = await api.patch(`/results/${id}`, payload);
    return getObject(res);
  },

  remove: async (id: string) => {
    const res = await api.delete(`/results/${id}`);
    return getObject(res);
  },
};