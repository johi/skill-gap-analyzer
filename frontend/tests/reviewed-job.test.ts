import { describe, expect, it } from 'vitest';
import { importedJobSchema } from '@/schemas/job-import';
import { normalizeReviewedJob, validateReviewedJob } from '@/services/job-import/reviewed-job';
import type { AnalyzedJob, ReviewedJob } from '@/services/job-import/reviewed-job';

const makeJob = (skills: { name: string; category: string; requirement: 'must_have' | 'nice_to_have' }[]) => importedJobSchema.parse({
  dateFound: '2026-10-17', company: 'Example', title: 'Developer', skills,
});
const analyze = (job: ReturnType<typeof makeJob>, resolution: 'existing' | 'review_required' = 'existing'): AnalyzedJob => ({
  job,
  skills: job.skills.map((skill, index) => ({ ...skill, resolution, canonicalName: skill.name, canonicalSkillId: resolution === 'existing' ? index + 1 : null })),
});
const review = (job: ReturnType<typeof makeJob>, analysis: AnalyzedJob | null, excluded = false): ReviewedJob => ({ jobIndex: 0, excluded, job, analysis });

describe('reviewed job domain functions', () => {
  it('deduplicates identical skill requirements without modifying the input', () => {
    const job = makeJob([{ name: 'Symfony', category: 'framework', requirement: 'must_have' }, { name: 'symfony', category: 'framework', requirement: 'must_have' }]);
    const result = normalizeReviewedJob(job, analyze(job));
    expect(result.skills).toHaveLength(1);
    expect(job.skills).toHaveLength(2);
  });
  it('preserves conflicting requirements for explicit review', () => {
    const job = makeJob([{ name: 'Laravel', category: 'framework', requirement: 'must_have' }, { name: 'laravel', category: 'framework', requirement: 'nice_to_have' }]);
    expect(normalizeReviewedJob(job, analyze(job)).skills).toHaveLength(2);
    expect(validateReviewedJob(review(job, analyze(job))).errors.some(error => error.includes('Conflicting requirements'))).toBe(true);
  });
  it('requires analysis for included jobs', () => {
    const job = makeJob([]);
    expect(validateReviewedJob(review(job, null)).valid).toBe(false);
    expect(validateReviewedJob(review(job, null, true)).valid).toBe(true);
  });
  it('flags unresolved skill normalization', () => {
    const job = makeJob([{ name: 'JS', category: 'language', requirement: 'must_have' }]);
    expect(validateReviewedJob(review(job, analyze(job, 'review_required'))).valid).toBe(false);
  });
});
