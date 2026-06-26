// Teacher form validation helpers and shared constants.

export const MAX_SUBJECTS = 6;

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function isValidEmail(email: string): boolean {
  // Standard email regex: must have proper domain with TLD
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export function isValidSriLankanPhone(phone: string): boolean {
  // Strip spaces, dashes and parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '');

  // Normalise the various international prefixes to the local 0XXXXXXXXX form
  if (cleaned.startsWith('+94')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('0094')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('94') && cleaned.length === 11) cleaned = '0' + cleaned.slice(2);

  // Valid Sri Lankan number: exactly 10 digits, starts with 0,
  // followed by a non-zero digit (covers mobile 07X and landlines 0XX)
  return /^0[1-9][0-9]{8}$/.test(cleaned);
}

export function isValidJoinDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const minDate = new Date('1990-01-01');
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1); // allow up to 1 year in future
  return date >= minDate && date <= maxDate;
}

export function isValidSubject(subject: string): boolean {
  // Subjects should only contain letters, spaces, ampersands, hyphens, and dots
  // No pure numbers or special characters like @@@
  const trimmed = subject.trim();
  if (!trimmed) return false;
  if (/^\d+$/.test(trimmed)) return false; // reject pure numbers
  return /^[a-zA-Z][a-zA-Z0-9\s&.\-/()]+$/.test(trimmed) || /^[a-zA-Z]+$/.test(trimmed);
}
