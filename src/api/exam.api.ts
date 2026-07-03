import api from '@/lib/axios';

export type ExamPayload = {
  title: string;
  moduleId: string;
  moduleName: string;
  batch: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  description?: string;
  totalMarks: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  isPublished?: boolean;
};


const unwrapArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const unwrapOne = (res: any): any => {
  if (res?.data !== undefined) return res.data;
  return res;
};

export const examApi = {
  async getAll(): Promise<any[]> {
    const res: any = await api.get('/exam-notices');
    return unwrapArray(res);
  },

  async getById(id: string): Promise<any> {
    const res: any = await api.get(`/exam-notices/${id}`);
    return unwrapOne(res);
  },

  async create(payload: ExamPayload): Promise<any> {
    const res: any = await api.post('/exam-notices', payload);
    return unwrapOne(res);
  },

  async update(id: string, payload: Partial<ExamPayload>): Promise<any> {
    const res: any = await api.patch(`/exam-notices/${id}`, payload);
    return unwrapOne(res);
  },

  async remove(id: string): Promise<any> {
    const res: any = await api.delete(`/exam-notices/${id}`);
    return unwrapOne(res);
  },

  async delete(id: string): Promise<any> {
    const res: any = await api.delete(`/exam-notices/${id}`);
    return unwrapOne(res);
  },
};
