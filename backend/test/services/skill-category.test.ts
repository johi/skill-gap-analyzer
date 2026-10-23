import { describe, expect, it } from 'vitest';
import { canonicalSkillCategory, normalizeSkillCategory } from '@/services/skill-category';
import { skillCategorySchema } from '@/schemas/skill';

describe('industry-independent skill categories', () => {
    it('normalizes machine identifiers and preserves acronyms', () => {
        expect(normalizeSkillCategory('programming_languages')).toBe('Programming Languages');
        expect(normalizeSkillCategory('  API  Integration  ')).toBe('API Integration');
        expect(normalizeSkillCategory('DevOps')).toBe('DevOps');
    });

    it('reuses an existing category ignoring case and whitespace', () => {
        expect(canonicalSkillCategory(' databases ', ['Databases'])).toBe('Databases');
    });

    it('never accepts a blank or underscore-only category', () => {
        expect(skillCategorySchema.safeParse('  _  ').success).toBe(false);
    });
});
