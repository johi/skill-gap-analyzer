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
        const provider = { analyze: vi.fn().mockResolvedValue(proposal()), categorize: vi.fn() };
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

    it('uses supplementary metadata for analysis but never stores it in originalText', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue(proposal()), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(
            advertisement,
            'https://careers.example.com/jobs/42',
            null,
            'Deadline: 12 January 2027'
        );
        expect(provider.analyze).toHaveBeenCalledWith(expect.stringContaining('SUPPLEMENTARY JOB METADATA'));
        expect(provider.analyze.mock.calls[0]?.[0]).toContain('Deadline: 12 January 2027');
        expect(result.originalText).toBe(advertisement);
        expect(result.originalText).not.toContain('Deadline:');
        expect(result.proposal.title).toBe('Senior TypeScript Developer');
    });

    it('preserves missing facts as null and flags incomplete analysis for review', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), company: null,
            skills: [{ name: 'TypeScript', category: null, requirement: null }],
        }), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.proposal.company).toBeNull();
        expect(result.requiresReview).toBe(true);
    });

    it('suppresses validation diagnostics during automated tests', async () => {
        const previous = process.env.DEBUG_HTML_CLASSIFICATION;
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            process.env.DEBUG_HTML_CLASSIFICATION = '1';
            const provider = { analyze: vi.fn().mockResolvedValue({
                ...proposal(), seniority: 'invalid_private_value',
            }), categorize: vi.fn() };
            await expect(new JobAnalysisService(provider).analyze(advertisement))
                .rejects.toBeInstanceOf(JobAnalysisInvalidResponseError);
            expect(spy).not.toHaveBeenCalled();
        } finally {
            if (previous === undefined) delete process.env.DEBUG_HTML_CLASSIFICATION;
            else process.env.DEBUG_HTML_CLASSIFICATION = previous;
            spy.mockRestore();
        }
    });


    it('corrects invalid deadline using one schema-guided retry', async () => {
        const initial = { ...proposal(), applicationDeadline: '30. november 2026' };
        const corrected = { ...proposal(), applicationDeadline: '2026-11-30' };
        const provider = {
            analyze: vi.fn().mockResolvedValue(initial),
            categorize: vi.fn(),
            correctAnalysis: vi.fn().mockResolvedValue(corrected),
        };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.proposal.applicationDeadline).toBe('2026-11-30');
        expect(provider.analyze).toHaveBeenCalledTimes(1);
        expect(provider.correctAnalysis).toHaveBeenCalledTimes(1);
        expect(provider.correctAnalysis).toHaveBeenCalledWith(
            advertisement,
            initial,
            expect.arrayContaining([expect.objectContaining({ path: 'applicationDeadline', code: 'invalid_format' })])
        );
    });

    it('does not request a correction for valid extraction', async () => {
        const provider = {
            analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '2026-11-30' }),
            categorize: vi.fn(),
            correctAnalysis: vi.fn(),
        };
        await new JobAnalysisService(provider).analyze(advertisement);
        expect(provider.correctAnalysis).not.toHaveBeenCalled();
    });

    it('never retries extraction more than once', async () => {
        const provider = {
            analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '30. november 2026' }),
            categorize: vi.fn(),
            correctAnalysis: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: 'not a date' }),
        };
        await expect(new JobAnalysisService(provider).analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisInvalidResponseError);
        expect(provider.correctAnalysis).toHaveBeenCalledTimes(1);
    });

    it('corrects other schema errors without date-specific handling', async () => {
        const provider = {
            analyze: vi.fn().mockResolvedValue({ ...proposal(), seniority: 'super_senior' }),
            categorize: vi.fn(),
            correctAnalysis: vi.fn().mockResolvedValue({ ...proposal(), seniority: 'senior' }),
        };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.proposal.seniority).toBe('senior');
        expect(provider.correctAnalysis.mock.calls[0]?.[2]).toEqual(
            expect.arrayContaining([expect.objectContaining({ path: 'seniority' })])
        );
    });

    it('rejects structurally invalid provider data', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), seniority: 'super_senior',
        }), categorize: vi.fn() };
        await expect(new JobAnalysisService(provider).analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisInvalidResponseError);
    });

    it('rejects duplicate skills', async () => {
        const first = proposal();
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...first, skills: [...first.skills, { ...first.skills[0], name: 'typescript' }],
        }), categorize: vi.fn() };
        await expect(new JobAnalysisService(provider).analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisInvalidResponseError);
    });

    it('allows advertisements with no extracted skills', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), skills: [],
        }), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.proposal.skills).toEqual([]);
    });
});

describe('Two-stage skill categorization', () => {
    it('reuses existing skill categories and categorizes only unmatched skills', async () => {
        const provider = {
            analyze: vi.fn().mockResolvedValue({
                ...proposal(),
                skills: [
                    { name: 'typescript', category: null, requirement: 'must_have' },
                    { name: 'RabbitMQ', category: null, requirement: 'nice_to_have' },
                ],
            }),
            categorize: vi.fn().mockResolvedValue({
                skills: [{ name: 'RabbitMQ', category: 'messaging_systems' }],
            }),
        };
        const catalogue = { findAll: vi.fn().mockResolvedValue([
            { id: 1, name: 'TypeScript', category: 'Programming Languages' },
            { id: 2, name: 'PostgreSQL', category: 'Databases' },
        ]) };
        const result = await new JobAnalysisService(provider, catalogue).analyze(advertisement);
        expect(provider.categorize).toHaveBeenCalledExactlyOnceWith(
            ['RabbitMQ'], ['Programming Languages', 'Databases'], advertisement
        );
        expect(result.proposal.skills).toEqual([
            { name: 'TypeScript', category: 'Programming Languages', requirement: 'must_have' },
            { name: 'RabbitMQ', category: 'Messaging Systems', requirement: 'nice_to_have' },
        ]);
        expect(result.requiresReview).toBe(true); // new category requires human acceptance
    });

    it('does not make a second AI call when every skill already exists', async () => {
        const provider = {
            analyze: vi.fn().mockResolvedValue(proposal()),
            categorize: vi.fn(),
        };
        const catalogue = { findAll: vi.fn().mockResolvedValue([
            { id: 1, name: 'TypeScript', category: 'Programming Languages' },
        ]) };
        const result = await new JobAnalysisService(provider, catalogue).analyze(advertisement);
        expect(provider.categorize).not.toHaveBeenCalled();
        expect(result.proposal.skills[0]?.category).toBe('Programming Languages');
        expect(result.requiresReview).toBe(false);
    });

    it('rejects incomplete or invented skill categorizations', async () => {
        const provider = {
            analyze: vi.fn().mockResolvedValue(proposal()),
            categorize: vi.fn().mockResolvedValue({
                skills: [{ name: 'Invented skill', category: 'Something' }],
            }),
        };
        const catalogue = { findAll: vi.fn().mockResolvedValue([]) };
        await expect(new JobAnalysisService(provider, catalogue).analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisInvalidResponseError);
    });
});
