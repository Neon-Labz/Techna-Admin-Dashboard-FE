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


export const MAIN_SUBJECTS = [
  'Engineering Technology',
  'Bio Systems Technology',
  'Science For Technology',
];

export const BASKET_SUBJECTS = [
  'Information Communication Technology',
  'Agricultural Science',
  'Mathematics',
  'Geography',
];

export const MAX_MAIN_SUBJECTS = 2;
export const MAX_BASKET_SUBJECTS = 1;

// Display-only labels; the original subject name is still stored/submitted.
const SUBJECT_DISPLAY_LABELS: Record<string, string> = {
  'Information Communication Technology': 'ICT',
};

export function subjectLabel(name: string): string {
  return SUBJECT_DISPLAY_LABELS[name] || name;
}

export type SubjectCategory = 'main' | 'basket';

// Canonical keys for case-insensitive matching of Main subjects.
const MAIN_SUBJECT_KEYS = MAIN_SUBJECTS.map((s) =>
  s.trim().toLowerCase().replace(/\s+/g, ' '),
);


export function getSubjectCategory(subject: string): SubjectCategory {
  const normalized = normalizeAlSubjects([subject])[0] || subject;
  const key = normalized.trim().toLowerCase().replace(/\s+/g, ' ');
  return MAIN_SUBJECT_KEYS.includes(key) ? 'main' : 'basket';
}

// Count selected subjects per category given a flat list of selected names.
export function countSubjectsByCategory(selected: string[] = []) {
  return selected.reduce(
    (acc, subject) => {
      acc[getSubjectCategory(subject)] += 1;
      return acc;
    },
    { main: 0, basket: 0 } as Record<SubjectCategory, number>,
  );
}

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
    .filter((subject) => subject && subject.trim());

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
