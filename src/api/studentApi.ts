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
  const students = await api.get<Student[], Student[]>('/students');
  return Array.isArray(students) ? students : [];
}

export async function getStudentById(id: string): Promise<Student> {
  const student = await api.get<Student, Student>(`/students/${id}`);
  return student;
}

export async function createStudent(
  payload: CreateStudentRequestPayload,
): Promise<Student> {
  const student = await api.post<Student, Student>('/students', payload);
  return student;
}

export async function updateStudent(
  id: string,
  payload: Partial<StudentPayload>,
): Promise<Student> {
  const student = await api.patch<Student, Student>(`/students/${id}`, payload);
  return student;
}

export async function deleteStudent(id: string): Promise<void> {
  await api.delete(`/students/${id}`);
}

export async function approveStudent(id: string): Promise<Student> {
  const student = await api.patch<Student, Student>(`/students/${id}/approve`);
  return student;
}