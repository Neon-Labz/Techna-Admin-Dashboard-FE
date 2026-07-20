export const EXAM_TYPES = [
  {
    value: 'Unit Examinations',
    label: 'UNIT EXAMINATIONS',
    description:
      "Assessments conducted after completing each unit to evaluate the student's understanding of that unit.",
  },
  {
    value: 'Practice Examinations',
    label: 'PRACTICE EXAMINATIONS',
    description:
      'Practice or mock assessments conducted to help students prepare for formal examinations.',
  },
  {
    value: 'Practical Examinations',
    label: 'PRACTICAL EXAMINATIONS',
    description:
      "Assessments used to evaluate the student's practical skills and hands-on knowledge.",
  },
  {
    value: 'Pilot Examinations',
    label: 'PILOT EXAMINATIONS',
    description:
      'Trial assessments conducted before formal examinations to evaluate readiness and identify areas for improvement.',
  },
  {
    value: 'Mid Examinations',
    label: 'MID EXAMINATIONS',
    description:
      "Assessments conducted in the middle of the course or semester to evaluate students' progress before the final examination.",
  },
  {
    value: 'Final Examinations',
    label: 'FINAL EXAMINATIONS',
    description:
      'Final assessments conducted at the end of the course, term, or academic period.',
  },
] as const;

export type ExamType = (typeof EXAM_TYPES)[number]['value'];

export const DEFAULT_EXAM_TYPE: ExamType = 'Unit Examinations';

export const EXAM_TYPE_OPTIONS = EXAM_TYPES.map(({ value, label }) => ({
  value,
  label,
}));

export const getExamTypeDescription = (examType: string) =>
  EXAM_TYPES.find((type) => type.value === examType)?.description || '';
