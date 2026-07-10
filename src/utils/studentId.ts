const PENDING_STUDENT_ID_PREFIX = 'PENDING';

export const isPendingStudentId = (studentId?: string | null): boolean =>
  !studentId || studentId.startsWith(PENDING_STUDENT_ID_PREFIX);

export const formatStudentId = (studentId?: string | null): string =>
  isPendingStudentId(studentId) ? 'Pending Approval' : (studentId as string);
