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
    const response = await api.get('/exam-notices');
    return response.data?.data || [];
  },

  async getById(id: string): Promise<any> {
    const response = await api.get(`/exam-notices/${id}`);
    return response.data?.data || response.data;
  },

  async create(payload: ExamPayload): Promise<any> {
    const response = await api.post('/exam-notices', payload);
    return response.data?.data || response.data;
  },

  async update(id: string, payload: Partial<ExamPayload>): Promise<any> {
    const response = await api.patch(`/exam-notices/${id}`, payload);
    return response.data?.data || response.data;
  },

  async remove(id: string): Promise<any> {
    const response = await api.delete(`/exam-notices/${id}`);
    return response.data;
  },
};