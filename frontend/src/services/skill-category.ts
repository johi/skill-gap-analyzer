/** UI category normalization mirrors the backend; no fixed industry taxonomy. */
export function normalizeSkillCategory(value: string): string {
  return value.replace(/_/g, ' ').trim().replace(/\s+/g, ' ')
    .split(' ')
    .map(word => /[A-Z]/.test(word.slice(1))
      ? word
      : word.charAt(0).toLocaleUpperCase('en-US') + word.slice(1).toLocaleLowerCase('en-US'))
    .join(' ');
}

export function categoryKey(value: string): string {
  return normalizeSkillCategory(value).toLocaleLowerCase('en-US');
}

export function canonicalCategory(value: string, existing: readonly string[]): string {
  return existing.find(category => categoryKey(category) === categoryKey(value)) ?? normalizeSkillCategory(value);
}

export function existingCategories(skills: readonly { category: string }[]): string[] {
  return Array.from(new Map(skills.map(skill => [categoryKey(skill.category), normalizeSkillCategory(skill.category)] as const)).entries())
    .map(([, category]) => category)
    .sort((a, b) => a.localeCompare(b));
}
