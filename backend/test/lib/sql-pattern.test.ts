import { describe, expect, it } from 'vitest';
import { containsLikePattern, escapeLikePattern } from '@/db/sql-pattern';

describe('SQL LIKE pattern utilities', () => {
    it('leaves ordinary characters unchanged', () => {
        expect(escapeLikePattern('Node.js')).toBe('Node.js');
    });

    it('escapes percent, underscore, and backslash', () => {
        expect(escapeLikePattern('50%_\\done')).toBe('50\\%\\_\\\\done');
    });

    it('wraps a literal search term with substring wildcards', () => {
        expect(containsLikePattern('a_b%')).toBe('%a\\_b\\%%');
    });

    it('preserves empty-string behavior', () => {
        expect(containsLikePattern('')).toBe('%%');
    });
});
