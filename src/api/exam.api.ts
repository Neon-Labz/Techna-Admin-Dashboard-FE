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
  status: string;
  isPublished?: boolean;
};

export const examApi = {
  async getAll(): Promise<any[]> {
    const { data } = await api.get('/exam-notices');
    return data.data || data;
  },

  async getById(id: string): Promise<any> {
    const { data } = await api.get(`/exam-notices/${id}`);
    return data.data || data;
  },

  async create(payload: ExamPayload): Promise<any> {
    const { data } = await api.post('/exam-notices', payload);
    return data.data || data;
  },

  async update(id: string, payload: Partial<ExamPayload>): Promise<any> {
    const { data } = await api.patch(`/exam-notices/${id}`, payload);
    return data.data || data;
  },

  async remove(id: string): Promise<any> {
    const { data } = await api.delete(`/exam-notices/${id}`);
    return data;
  },
};