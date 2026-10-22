import { describe, expect, it } from 'vitest';
import { analysisToReviewInput, validateReviewedAnalysis } from '@/services/job-analysis/reviewed-job';
import type { JobAdvertisementAnalysis } from '@/schemas/job-analysis';

const analysis: JobAdvertisementAnalysis = {
  dateFound: '2026-10-22',
  originalText: 'Example Company needs a TypeScript developer with testing experience. '.repeat(2),
  requiresReview: true,
  proposal: {
    company: 'Example Company', title: 'Developer', location: null, workModel: null,
    employmentType: null, seniority: null, primaryRole: null, yearsRequired: '5+',
    educationRequirement: null, languageRequirements: [], salaryRate: null,
    skills: [
      { name: 'TypeScript', category: 'Language', requirement: 'must_have' },
      { name: '10+ years software engineering', category: null, requirement: null },
    ],
  },
};

describe('UC-12 reviewed analysis', () => {
  it('preserves original text and missing fields without inventing metadata', () => {
    const draft = analysisToReviewInput(analysis);
    expect(draft.originalText).toBe(analysis.originalText);
    expect(draft.company).toBe('Example Company');
    expect(draft.location).toBeNull();
    expect(draft.sourceUrl).toBeNull();
    expect(draft.skills[1].category).toBe('');
    expect(draft.skills[1].requirement).toBeNull();
  });

  it('rejects invalid or duplicate skills before approval', () => {
    const draft = analysisToReviewInput(analysis);
    // The draft contains unresolved requirements; the form cannot submit it unchanged.
    expect(draft.skills[1].requirement).toBeNull();
    expect(validateReviewedAnalysis(draft).valid).toBe(false);
    draft.skills[1] = { name: 'typescript', category: 'Language', requirement: 'nice_to_have' };
    const result = validateReviewedAnalysis(draft);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('Duplicate skill');
  });

  it('allows removal of non-skills and accepts valid corrections', () => {
    const draft = analysisToReviewInput(analysis);
    draft.skills.splice(1, 1);
    const result = validateReviewedAnalysis(draft);
    expect(result.valid).toBe(true);
    expect(result.value?.skills).toHaveLength(1);
  });

  it('rejects duplicate language requirements', () => {
    const draft = analysisToReviewInput(analysis);
    draft.skills.splice(1, 1);
    draft.languageRequirements = [
      { language: 'da', requirement: 'required' },
      { language: 'da', requirement: 'preferred' },
    ];
    expect(validateReviewedAnalysis(draft).errors.join(' ')).toContain('Duplicate language');
  });
});
