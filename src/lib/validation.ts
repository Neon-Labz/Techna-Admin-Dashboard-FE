const DUMMY_PATTERNS = [
  /^[a-z]{4,}$/i,
  /(.)\1{2,}/,
  /^(test|dummy|asdf|qwerty|zxcv|abcd|abc|xyz|foo|bar|baz|string|undefined|null|na|n\/a|sample|example)\d*$/i,
  /^[^aeiou]{5,}$/i,
];

export function isDummyValue(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  return DUMMY_PATTERNS.some(pattern => pattern.test(trimmed));
}

export function validateModuleForm(data: {
  name: string;
  description?: string;
}): string | null {
  if (!data.name?.trim()) return 'Module name is required';
  if (data.name.trim().length < 3) return 'Module name must be at least 3 characters';
  if (isDummyValue(data.name)) return 'Module name appears invalid — please enter a real module name';
  if (data.description && isDummyValue(data.description)) return 'Description appears invalid — please enter a real description';
  return null;
}

export function validateVideoForm(data: {
  title: string;
  description?: string;
}): string | null {
  if (!data.title?.trim()) return 'Video title is required';
  if (data.title.trim().length < 3) return 'Video title must be at least 3 characters';
  if (isDummyValue(data.title)) return 'Video title appears invalid — please enter a real title';
  if (data.description && isDummyValue(data.description)) return 'Description appears invalid — please enter a real description';
  return null;
}
