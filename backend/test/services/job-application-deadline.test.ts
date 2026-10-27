import { describe, expect, it } from 'vitest';
import { normalizeJobApplicationDeadline } from '@/services/job-application-deadline';
import { jobProposalSchema } from '@/schemas/job-analysis';

describe('normalizeJobApplicationDeadline', () => {
    it.each([
        ['2026-11-30', '2026-11-30'],
        ['30-11-2026', '2026-11-30'],
        ['30/11/2026', '2026-11-30'],
        ['30.11.2026', '2026-11-30'],
        ['30. november 2026', '2026-11-30'],
        ['30 November 2026', '2026-11-30'],
        ['November 30, 2026', '2026-11-30'],
        ['2026-11-30T00:00:00Z', '2026-11-30'],
        ['8. januar 2027', '2027-01-08'],
    ])('normalizes %s', (input, expected) => {
        expect(normalizeJobApplicationDeadline(input)).toBe(expected);
    });

    it.each(['31-02-2026', '2026-02-30', 'tomorrow', '2026-11-30 or later'])('does not fabricate a date from %s', input => {
        expect(normalizeJobApplicationDeadline(input)).toBe(input);
        expect(jobProposalSchema.shape.applicationDeadline.safeParse(normalizeJobApplicationDeadline(input)).success).toBe(false);
    });

    it('preserves null and absent deadlines', () => {
        expect(normalizeJobApplicationDeadline(null)).toBeNull();
        expect(normalizeJobApplicationDeadline(undefined)).toBeUndefined();
    });
});
