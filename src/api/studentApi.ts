import api from '../lib/axios';
import type { Student } from '../types';

export type StudentPayload = Omit<
  Student,
  'id' | 'studentId' | 'qrToken' | 'attendance' | 'payments'
>;

export type CreateStudentRequestPayload = {
  name: string;
  fullNameTamil?: string;
  fullNameEnglish?: string;

  email: string;
  phone: string;
  whatsappNo?: string;
  parentsNo?: string;

  batch: string;

  modules?: string[];
  subjects?: string[];

  address?: string;
  permanentAddress?: string;
  contactAddress?: string;
  administrativeDistrict?: string;
  postalCode?: string;

  dob?: string;
  dateOfBirth?: string;

  nicNo?: string;
  school?: string;
  avatar?: string;

  parentName?: string;
  parentPhone?: string;

  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianMobile?: string;
  guardianAddress?: string;
  guardianFixedTel?: string;

  fixedTelephone?: string;
  residingSince?: string;

  race?: string;
  religion?: string;
  citizenByDescent?: string;
  contactPerson?: string;

  olCategory?: string;
  olYear?: string;
  olIndexNumber?: string;
  olNameUsed?: string;
  olAccept?: string;
  olResults?: any[];

  password: string;
};

export async function getStudents(): Promise<Student[]> {
  const response = await api.get('/students');

  console.log('Students API Response:', response);

  // The axios response interceptor already unwraps data.data,
  // so `response` here is the actual payload (array or object with students).
  return response as unknown as Student[];
}

export async function getStudentById(id: string): Promise<Student> {
  const response = await api.get(`/students/${id}`);

  // Interceptor already unwraps the response envelope
  return response as unknown as Student;
}

export async function createStudent(
  payload: CreateStudentRequestPayload,
): Promise<Student> {
  console.log('[createStudent] payload check', {
    nicNo: payload.nicNo,
    school: payload.school,
    fatherName: payload.fatherName,
    motherName: payload.motherName,
    guardianMobile: payload.guardianMobile,
    race: payload.race,
    religion: payload.religion,
    payload,
  });

  const response = await api.post('/students', payload);

  // Interceptor already unwraps the response envelope
  return response as unknown as Student;
}

export async function updateStudent(
  id: string,
  payload: Partial<StudentPayload>,
): Promise<Student> {
  const response = await api.patch(`/students/${id}`, payload);

  // Interceptor already unwraps the response envelope
  return response as unknown as Student;
}

export async function deleteStudent(id: string): Promise<void> {
  await api.delete(`/students/${id}`);
}

export async function approveStudent(id: string): Promise<Student> {
  const response = await api.patch(`/students/${id}/approve`);

  // Interceptor already unwraps the response envelope
  return response as unknown as Student;
}

export async function rejectStudent(id: string, reason?: string): Promise<Student> {
  const response = await api.patch(`/students/${id}/reject`, { reason });

  // Interceptor already unwraps the response envelope
  return response as unknown as Student;
}