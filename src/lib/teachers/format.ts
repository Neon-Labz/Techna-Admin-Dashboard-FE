// Formatting / normalisation helpers for teacher data.
import type { Teacher } from '@/types';
import type { TeacherFromApi } from '@/api/teacher.api';

export function formatSubjects(subjects: string[]): string {
  return subjects.join(', ');
}

export function normalizeSubject(subject: TeacherFromApi['subject'] | string[]): string[] {
  if (Array.isArray(subject)) return subject;
  return subject.split(',').map(s => s.trim()).filter(Boolean);
}

export function normalizePhotoUrl(url?: string): string {
  if (!url || !url.trim()) return '';
  let normalized = url.trim();
  // Fix the known Cloudflare R2 public-base-url typo where the host ends with
  // ".r2.devXXX" (e.g. ".r2.devya") instead of the correct ".r2.dev".
  normalized = normalized.replace(/\.r2\.dev[a-z]+/gi, '.r2.dev');
  // Ensure the URL is absolute
  if (normalized && !normalized.startsWith('http') && !normalized.startsWith('data:')) {
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
    return `${baseUrl}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  }
  return normalized;
}

// Remove duplicate strings ignoring case, keeping the first occurrence.
export function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

const TITLE_PREFIXES = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof',
  'mr.', 'mrs.', 'ms.', 'miss.', 'dr.', 'prof.',
]);

export function stripTitle(name: string): string {
  return (name || '')
    .trim()
    .split(/\s+/)
    .filter(p => !TITLE_PREFIXES.has(p.toLowerCase()))
    .join(' ');
}

export function titleFromGender(gender: Teacher['gender']): string {
  if (gender === 'male') return 'Mr.';
  if (gender === 'female') return 'Ms.';
  return '';
}

const FEMALE_NAMES = new Set([
  'nimali', 'geerthika', 'sara', 'sarah', 'mary', 'emma', 'olivia', 'sophia',
  'priya', 'anjali', 'deepika', 'kavya', 'lakshmi', 'shanthi', 'malini',
  'kumari', 'nisha', 'divya', 'ramya', 'thanuja', 'dilani', 'sandya',
  'jane', 'linda', 'susan', 'jessica', 'amanda', 'fatima', 'aisha',
]);

const MALE_NAMES = new Set([
  'michael', 'david', 'john', 'james', 'robert', 'william', 'hari', 'gowsikan',
  'gowsi', 'joe', 'suka', 'siva', 'kumar', 'raj', 'ravi', 'arun', 'vijay',
  'anil', 'sunil', 'mahesh', 'suresh', 'ramesh', 'athithya', 'kajan',
  'mohamed', 'ahmed', 'thomas', 'daniel', 'peter', 'paul', 'mark',
]);

export function inferGender(name: string): Teacher['gender'] {
  const trimmed = (name || '').trim().toLowerCase();
  if (/^(mr|dr|prof)\.?\s/.test(trimmed)) return 'male';
  if (/^(mrs|ms|miss)\.?\s/.test(trimmed)) return 'female';
  const first = stripTitle(name).split(/\s+/)[0]?.toLowerCase() ?? '';
  if (!first) return '';
  if (FEMALE_NAMES.has(first)) return 'female';
  if (MALE_NAMES.has(first)) return 'male';
  return '';
}

export function displayName(t: Teacher): string {
  const clean = stripTitle(t.name);
  const gender = t.gender || inferGender(t.name);
  const title = titleFromGender(gender);
  return title ? `${title} ${clean}` : clean;
}

export function getInitials(name: string): string {
  const parts = stripTitle(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function mapApiTeacher(t: TeacherFromApi): Teacher {
  return {
    id: t._id,
    name: t.fullName,
    firstName: t.firstName ?? '',
    lastName: t.lastName ?? '',
    email: t.email,
    phone: t.phone,
    gender: t.gender || inferGender(t.fullName),
    subject: normalizeSubject(t.subject),
    qualification: t.qualification ?? '',
    experience: t.experience,
    address: t.address,
    joinDate: t.joinDate,
    status: t.status,
    photoUrl: normalizePhotoUrl(t.photoUrl),
    degree: t.degree ?? [],
    specializations: t.specializations ?? [],
    awards: t.awards ?? [],
    achievements: t.achievements ?? [],
    biography: t.biography ?? '',
  };
}
