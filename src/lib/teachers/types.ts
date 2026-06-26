// Teacher form model and its empty/default value.

export type TeacherForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subjects: string[];
  qualification: string[];
  address: string;
  experience: string;
  joinDate: string;
  specializations: string[];
  biography: string;
  status: 'active' | 'inactive';
  awards: string[];
  achievements: string[];
};

export const emptyTeacher: TeacherForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  subjects: [],
  qualification: [],
  address: '',
  experience: '',
  joinDate: new Date().toISOString().split('T')[0],
  specializations: [],
  biography: '',
  status: 'active',
  awards: [],
  achievements: [],
};
