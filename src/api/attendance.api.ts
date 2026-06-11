import api from '@/lib/axios';

export const attendanceApi = {
  async getStudents() {
    const { data } = await api.get('/students');
    return data.data || data;
  },

  async getModules() {
    const { data } = await api.get('/modules');
    return data.data || data;
  },

  // GET /attendance/report
  // Backend assertDateString requires YYYY-MM-DD — send plain date, not ISO.
  async getReport(params?: {
    studentId?: string;
    moduleId?: string;
    batch?: string;
    date?: string;   // YYYY-MM-DD
    from?: string;
    to?: string;
  }) {
    const cleanParams = params
      ? {
          ...params,
          date: params.date ? params.date.split('T')[0] : undefined,
        }
      : undefined;

    const { data } = await api.get('/attendance/report', { params: cleanParams });
    return data.data || data;
  },

  // POST /attendance
  // Backend stores date as full ISO string ("2026-06-11T00:00:00.000Z").
  // ensureUniqueAttendanceSession uses $regex `^YYYY-MM-DD` so it always detects
  // existing records → returns 409. We catch 409 and PATCH instead.
  async markAttendance(payload: {
    studentId: string;
    moduleId: string;
    moduleName: string;
    date: string;   // YYYY-MM-DD from the date input
    status: 'present' | 'absent';
  }) {
    // Backend DTO requires ISO8601 for date and markedAt
    const isoDate = payload.date.includes('T')
      ? payload.date
      : new Date(payload.date + 'T00:00:00.000Z').toISOString();

    try {
      const { data } = await api.post('/attendance', {
        studentId:  payload.studentId,
        moduleId:   payload.moduleId,
        moduleName: payload.moduleName,
        date:       isoDate,
        status:     payload.status,
        markedAt:   new Date().toISOString(),
      });
      return data.data || data;

    } catch (err: any) {
      // 409 = record already exists → find it and PATCH its status
      if (err?.response?.status === 409) {
        return attendanceApi.findAndPatchExisting(
          payload.studentId,
          payload.moduleId,
          payload.date.split('T')[0],
          payload.status,
        );
      }
      throw err;
    }
  },

  // Called when markAttendance gets a 409.
  // Fetches ALL records for this student (no date filter) and matches by
  // moduleId + date prefix in memory. This works regardless of whether the
  // stored date is "2026-06-11" or "2026-06-11T00:00:00.000Z".
  async findAndPatchExisting(
    studentId: string,
    moduleId: string,
    date: string,   // YYYY-MM-DD
    status: 'present' | 'absent',
  ) {
    // No date param — fetch all records for this student, filter in memory
    const report = await attendanceApi.getReport({ studentId });

    const students: any[] = report?.students ?? [];
    let existingId: string | null = null;

    for (const s of students) {
      if (s.studentId === studentId) {
        const rec = (s.attendance ?? []).find(
          (a: any) =>
            a.moduleId === moduleId &&
            // Handles stored dates as "2026-06-11" or "2026-06-11T00:00:00.000Z"
            a.date?.startsWith(date),
        );
        if (rec?.id) {
          existingId = rec.id;
          break;
        }
      }
    }

    if (!existingId) {
      throw new Error(
        `Attendance already marked but could not locate record ` +
        `for ${studentId} / module ${moduleId} / ${date}`
      );
    }

    return attendanceApi.updateAttendance(existingId, { status });
  },

  async updateAttendance(
    id: string,
    payload: { status: 'present' | 'absent' }
  ) {
    const { data } = await api.patch(`/attendance/${id}`, payload);
    return data.data || data;
  },

  async deleteAttendance(id: string) {
    const { data } = await api.delete(`/attendance/${id}`);
    return data.data || data;
  },
};