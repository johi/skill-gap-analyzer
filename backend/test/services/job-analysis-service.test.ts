import { describe, expect, it, vi } from 'vitest';
import { JobAnalysisService } from '@/services/job-analysis-service';
import { JobAnalysisInvalidResponseError } from '@/errors/job-analysis-errors';

const advertisement = 'Example Company seeks a Senior TypeScript Developer for our Copenhagen office. Full-time employment.';

function proposal() {
    return {
        company: 'Example Company',
        title: 'Senior TypeScript Developer',
        location: 'Copenhagen',
        workModel: null,
        employmentType: 'full_time',
        seniority: 'senior',
        primaryRole: 'Backend development',
        yearsRequired: null,
        educationRequirement: null,
        languageRequirements: [],
        salaryRate: null,
        skills: [{ name: 'TypeScript', category: 'language', requirement: 'must_have' }],
    };
}

describe('JobAnalysisService (UC-09–11)', () => {
    it('returns structured metadata and skills without persistence', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue(proposal()) };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(provider.analyze).toHaveBeenCalledExactlyOnceWith(advertisement);
        expect(result).toMatchObject({
            originalText: advertisement,
            requiresReview: false,
            proposal: { company: 'Example Company', title: 'Senior TypeScript Developer' },
        });
        expect(result.proposal.skills).toHaveLength(1);
        expect(result.dateFound).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('preserves missing facts as null and flags incomplete analysis for review', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), company: null,
            skills: [{ name: 'TypeScript', category: null, requirement: null }],
        }) };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.proposal.company).toBeNull();
        expect(result.requiresReview).toBe(true);
    });

    it('rejects structurally invalid provider data', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), seniority: 'super_senior',
        }) };
        await expect(new JobAnalysisService(provider).analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisInvalidResponseError);
    });

    it('rejects duplicate skills', async () => {
        const first = proposal();
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...first, skills: [...first.skills, { ...first.skills[0], name: 'typescript' }],
        }) };
        await expect(new JobAnalysisService(provider).analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisInvalidResponseError);
    });

    it('allows advertisements with no extracted skills', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), skills: [],
        }) };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.proposal.skills).toEqual([]);
    });
});
