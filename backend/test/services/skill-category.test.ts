import { describe, expect, it } from 'vitest';
import { canonicalSkillCategory, normalizeSkillCategory, uniqueSkillCategories } from '@/services/skill-category';
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

    it('deduplicates normalized categories and excludes empty categories', () => {
        expect(uniqueSkillCategories([
            'programming_languages',
            'Programming Languages',
            ' databases ',
            'Databases',
            ' _ ',
            '',
            'API Integration',
        ])).toEqual(['Programming Languages', 'Databases', 'API Integration']);
    });

    it('never accepts a blank or underscore-only category', () => {
        expect(skillCategorySchema.safeParse('  _  ').success).toBe(false);
    });
});
