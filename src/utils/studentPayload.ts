import type { OLResult } from '../types';

export const AL_SUBJECT_OPTIONS = [
  'Engineering Technology',
  'Bio Systems Technology',
  'Science For Technology',
  'Information Communication Technology',
  'Agricultural Science',
  'Mathematics',
  'Geography',
];

export const OL_GRADE_OPTIONS = [
  'A+',
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'S',
  'F',
  'AB',
];

const SUBJECT_ALIASES: Record<string, string> = {
  'Science for Technology': 'Science For Technology',
  'Information & Communication Technology': 'Information Communication Technology',
  'Agricultural Technology': 'Agricultural Science',
};

export function normalizeAlSubjects(subjects: string[] = []): string[] {
  const normalized = subjects
    .map((subject) => SUBJECT_ALIASES[subject] || subject)
    .filter((subject) => AL_SUBJECT_OPTIONS.includes(subject));

  return Array.from(new Set(normalized));
}

export function cleanOlResults(olResults: OLResult[] = []) {
  return olResults
    .map((row) => ({
      year: row.year?.trim(),
      indexNumber: row.indexNumber?.trim(),
      english: row.english || undefined,
      mathematics: row.mathematics || undefined,
      science: row.science || undefined,
      sinhala: row.sinhala || undefined,
      tamil: row.tamil || undefined,
    }))
    .filter((row) =>
      Object.values(row).some((value) => typeof value === 'string' && value),
    );
}
