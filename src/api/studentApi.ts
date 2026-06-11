import api from '../lib/axios';
import type { Student } from '../types';

export type StudentPayload = Omit<
  Student,
  'id' | 'studentId' | 'qrToken' | 'attendance' | 'payments'
>;

export type CreateStudentRequestPayload = {
  name: string;
  fullNameEnglish?: string;
  email: string;
  phone: string;
  batch: string;
  modules?: string[];
  address?: string;
  dob?: string;
  avatar?: string;
  parentName?: string;
  parentPhone?: string;
  password: string;
};

export async function getStudents(): Promise<Student[]> {
  return api.get('/students');
}

export async function getStudentById(id: string): Promise<Student> {
  return api.get(`/students/${id}`);
}

export async function createStudent(
  payload: CreateStudentRequestPayload,
): Promise<Student> {
  return api.post('/students', payload);
}

export async function updateStudent(
  id: string,
  payload: Partial<StudentPayload>,
): Promise<Student> {
  return api.patch(`/students/${id}`, payload);
}

export async function deleteStudent(id: string): Promise<void> {
  return api.delete(`/students/${id}`);
}

export async function approveStudent(id: string): Promise<Student> {
  return api.patch(`/students/${id}/approve`);
}
