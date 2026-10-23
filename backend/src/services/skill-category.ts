/** Human-readable, industry-independent category names. Never persist machine identifiers. */
export function normalizeSkillCategory(value: string): string {
    return value.replace(/_/g, ' ').trim().replace(/\s+/g, ' ')
        .split(' ')
        .map(word => {
            // Preserve acronyms (API, CI/CD) and intentional internal capitals (DevOps).
            if (/[A-Z]/.test(word.slice(1))) return word;
            return word.charAt(0).toLocaleUpperCase('en-US') + word.slice(1).toLocaleLowerCase('en-US');
        })
        .join(' ');
}

export function categoryKey(value: string): string {
    return normalizeSkillCategory(value).toLocaleLowerCase('en-US');
}

export function canonicalSkillCategory(value: string, known: readonly string[]): string {
    const normalized = normalizeSkillCategory(value);
    return known.find(category => categoryKey(category) === categoryKey(normalized)) ?? normalized;
}
