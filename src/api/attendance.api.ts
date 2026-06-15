import api from '@/lib/axios';

const unwrap = (res: any) => {
  const data = res?.data ?? res;
  return data?.data ?? data;
};

const toArray = (value: any) => {
  const data = unwrap(value);

  if (Array.isArray(data)) return data;

  return (
    data?.students ||
    data?.modules ||
    data?.records ||
    data?.attendance ||
    data?.data ||
    []
  );
};

export const attendanceApi = {
  async getStudents() {
    const res = await api.get('/students');
    return toArray(res);
  },

  async getModules() {
    const res = await api.get('/modules');
    return toArray(res);
  },

  async getReport(params?: {
    studentId?: string;
    moduleId?: string;
    batch?: string;
    date?: string;
    from?: string;
    to?: string;
  }) {
    const cleanParams = params
      ? {
          ...params,
          date: params.date ? params.date.split('T')[0] : undefined,
        }
      : undefined;

    const res = await api.get('/attendance/report', { params: cleanParams });
    return unwrap(res);
  },

  async markAttendance(payload: {
    studentId: string;
    moduleId: string;
    moduleName: string;
    date: string;
    status: 'present' | 'absent';
  }) {
    const isoDate = payload.date.includes('T')
      ? payload.date
      : new Date(payload.date + 'T00:00:00.000Z').toISOString();

    try {
      const res = await api.post('/attendance', {
        studentId: payload.studentId,
        moduleId: payload.moduleId,
        moduleName: payload.moduleName,
        date: isoDate,
        status: payload.status,
        markedAt: new Date().toISOString(),
      });

      return unwrap(res);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        return attendanceApi.findAndPatchExisting(
          payload.studentId,
          payload.moduleId,
          payload.date.split('T')[0],
          payload.status
        );
      }

      throw err;
    }
  },

  async findAndPatchExisting(
    studentId: string,
    moduleId: string,
    date: string,
    status: 'present' | 'absent'
  ) {
    const report = await attendanceApi.getReport({ studentId });
    const students: any[] = report?.students ?? [];

    let existingId: string | null = null;

    for (const s of students) {
      if (s.studentId === studentId || s.id === studentId || s._id === studentId) {
        const rec = (s.attendance ?? []).find(
          (a: any) =>
            String(a.moduleId) === String(moduleId) &&
            String(a.date || '').startsWith(date)
        );

        if (rec?.id || rec?._id) {
          existingId = rec.id || rec._id;
          break;
        }
      }
    }

    if (!existingId) {
      throw new Error('Attendance already marked but record not found');
    }

    return attendanceApi.updateAttendance(existingId, { status });
  },

  async updateAttendance(
    id: string,
    payload: { status: 'present' | 'absent' }
  ) {
    const res = await api.patch(`/attendance/${id}`, payload);
    return unwrap(res);
  },

  async deleteAttendance(id: string) {
    const res = await api.delete(`/attendance/${id}`);
    return unwrap(res);
  },

  async getByStudent(studentId: string) {
    const res = await api.get(`/attendance/student/${studentId}`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },
};