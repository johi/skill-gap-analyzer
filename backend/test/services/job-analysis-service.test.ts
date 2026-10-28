import { describe, expect, it, vi } from 'vitest';
import { JobAnalysisService } from '@/services/job-analysis-service';
import { JobAnalysisInvalidResponseError } from '@/errors/job-analysis-errors';

const advertisement = 'Example Company seeks a Senior TypeScript Developer for our Copenhagen office. Full-time employment.';

function proposal() {
    return {
        applicationDeadline: null,
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

describe('JobAnalysisService', () => {
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


    it('corrects an invalid deadline format using one schema-guided retry', async () => {
        const source = 'Application deadline: 30 November 2026';
        const deadlineAdvertisement = `${advertisement} ${source}`;
        const initial = { ...proposal(), applicationDeadline: '30 November 2026' };
        const corrected = { ...proposal(), applicationDeadline: '2026-11-30' };
        const provider = {
            analyze: vi.fn().mockResolvedValue(initial),
            categorize: vi.fn(),
            correctAnalysis: vi.fn().mockResolvedValue(corrected),
        };
        const result = await new JobAnalysisService(provider).analyze(deadlineAdvertisement);
        expect(result.proposal.applicationDeadline).toBe('2026-11-30');
        expect(provider.analyze).toHaveBeenCalledTimes(1);
        expect(provider.correctAnalysis).toHaveBeenCalledTimes(1);
        expect(provider.correctAnalysis).toHaveBeenCalledWith(
            deadlineAdvertisement,
            initial,
            expect.arrayContaining([expect.objectContaining({ path: 'applicationDeadline', code: 'invalid_format' })])
        );
    });

    it('resolves a yearless deadline without allowing the AI to supply a year', async () => {
        vi.useFakeTimers();
        try {
            vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
            const source = 'Application deadline: 16 November';
            const provider = {
                analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '11-16' }),
                categorize: vi.fn(),
                correctAnalysis: vi.fn(),
            };
            const result = await new JobAnalysisService(provider).analyze(`${advertisement} ${source}`);
            expect(result.proposal.applicationDeadline).toBe('2026-11-16');
            expect(provider.correctAnalysis).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('corrects an invented year when the source contains only a day and month', async () => {
        vi.useFakeTimers();
        try {
            vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
            const provider = {
                analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '2023-11-16' }),
                categorize: vi.fn(),
                correctAnalysis: vi.fn(),
            };
            const source = `${advertisement} Application deadline: 16 November. The platform was updated in 2026.`;
            const result = await new JobAnalysisService(provider).analyze(source);
            expect(result.proposal.applicationDeadline).toBe('2026-11-16');
            expect(provider.correctAnalysis).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('uses next year when the deadline has passed and the AI supplies an unsupported year', async () => {
        vi.useFakeTimers();
        try {
            vi.setSystemTime(new Date('2026-12-01T12:00:00Z'));
            const provider = {
                analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '2023-11-16' }),
                categorize: vi.fn(),
            };
            const result = await new JobAnalysisService(provider).analyze(`${advertisement} Application deadline: 16 November`);
            expect(result.proposal.applicationDeadline).toBe('2027-11-16');
        } finally {
            vi.useRealTimers();
        }
    });

    it('resolves an elapsed yearless deadline to its next occurrence', async () => {
        vi.useFakeTimers();
        try {
            vi.setSystemTime(new Date('2026-12-01T12:00:00Z'));
            const provider = {
                analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '11-16' }),
                categorize: vi.fn(),
            };
            const result = await new JobAnalysisService(provider).analyze(`${advertisement} Application deadline: 16 November`);
            expect(result.proposal.applicationDeadline).toBe('2027-11-16');
        } finally {
            vi.useRealTimers();
        }
    });

    it.each(['08-10', '2023-08-10'])(
        'uses next year for a 10 August deadline when today is 28 October 2026 (AI output: %s)',
        async extractedDeadline => {
            vi.useFakeTimers();
            try {
                vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
                const provider = {
                    analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: extractedDeadline }),
                    categorize: vi.fn(),
                    correctAnalysis: vi.fn(),
                };
                const result = await new JobAnalysisService(provider).analyze(
                    `${advertisement} Application deadline: 10 August`
                );
                expect(result.proposal.applicationDeadline).toBe('2027-08-10');
                expect(provider.correctAnalysis).not.toHaveBeenCalled();
            } finally {
                vi.useRealTimers();
            }
        }
    );

    it('preserves the explicitly stated year, including dates in the past', async () => {
        const source = 'Application deadline: 16 November 2023';
        const provider = {
            analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '2023-11-16' }),
            categorize: vi.fn(),
        };
        const result = await new JobAnalysisService(provider).analyze(`${advertisement} ${source}`);
        expect(result.proposal.applicationDeadline).toBe('2023-11-16');
    });

    it('preserves null when the advertisement has no application deadline', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue(proposal()), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.proposal.applicationDeadline).toBeNull();
    });

    it('retains a deadline extracted from supplementary metadata without changing originalText', async () => {
        const source = 'Deadline: 12 January 2027';
        const provider = {
            analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '2027-01-12' }),
            categorize: vi.fn(),
        };
        const result = await new JobAnalysisService(provider).analyze(advertisement, null, null, source);
        expect(result.proposal.applicationDeadline).toBe('2027-01-12');
        expect(result.originalText).toBe(advertisement);
        expect(provider.analyze.mock.calls[0]?.[0]).toContain(source);
    });

    it('does not request a correction for a valid extracted date', async () => {
        const source = 'Application deadline: 30 November 2026';
        const provider = {
            analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '2026-11-30' }),
            categorize: vi.fn(),
            correctAnalysis: vi.fn(),
        };
        const result = await new JobAnalysisService(provider).analyze(`${advertisement} ${source}`);
        expect(result.proposal.applicationDeadline).toBe('2026-11-30');
        expect(provider.correctAnalysis).not.toHaveBeenCalled();
    });

    it('never retries extraction more than once', async () => {
        const provider = {
            analyze: vi.fn().mockResolvedValue({ ...proposal(), applicationDeadline: '30 November 2026' }),
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
