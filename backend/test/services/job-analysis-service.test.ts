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
    it('passes a labeled source title to AI and preserves the exact advertisement', async () => {
        const raw = 'THE OPPORTUNITY\n\nDevelop APIs and services using TypeScript and PostgreSQL.';
        const provider = { analyze: vi.fn().mockResolvedValue({ ...proposal(), title: null }), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(
            raw, 'https://careers.example.com/jobs/42', 'Senior Platform Developer'
        );
        expect(provider.analyze).toHaveBeenCalledExactlyOnceWith(
            `Job title: Senior Platform Developer\n\n${raw}`
        );
        expect(result.proposal.title).toBe('Senior Platform Developer');
        expect(result.originalText).toBe(raw);
    });

    it('preserves extracted contacts and explicit deadline in its proposal', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), applicationDeadline: '2026-12-01',
            contacts: [
                { name: 'Anna', role: 'Recruiter', email: 'anna@example.com', phone: null },
                { name: 'Peter', role: null, email: null, phone: '+45 12345678' },
            ],
        }), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.proposal.applicationDeadline).toBe('2026-12-01');
        expect(result.proposal.contacts).toHaveLength(2);
        expect(result.proposal.contacts?.[0]?.role).toBeNull(); // Role not present in the source
    });

    it('keeps a contact role only when the same source line supports it', async () => {
        const raw = 'Contact Anna (Recruiter) for questions about this Senior Developer vacancy.';
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), contacts: [{ name: 'Anna', role: 'Recruiter', email: null, phone: null }],
        }), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(raw);
        expect(result.proposal.contacts?.[0]?.role).toBe('Recruiter');
    });

    it('rejects malformed application deadlines', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), applicationDeadline: 'next Friday',
        }), categorize: vi.fn() };
        await expect(new JobAnalysisService(provider).analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisInvalidResponseError);
    });

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

    it('preserves missing facts as null and flags incomplete analysis for review', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), company: null,
            skills: [{ name: 'TypeScript', category: null, requirement: null }],
        }), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.proposal.company).toBeNull();
        expect(result.requiresReview).toBe(true);
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


describe('Source advertisement preservation', () => {
    it('preserves all original lines without rewriting or deletion', async () => {
        const raw = 'Role overview\n\n' + advertisement + '\nApplication information and benefits.';
        const provider = { analyze: vi.fn().mockResolvedValue(proposal()), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(raw);
        expect(provider.analyze).toHaveBeenCalledExactlyOnceWith(raw);
        expect(result.originalText).toBe(raw);
    });

    it('ignores any invented cleanedAdvertisement field', async () => {
        const provider = { analyze: vi.fn().mockResolvedValue({
            ...proposal(), cleanedAdvertisement: 'AI invented rewritten content',
        }), categorize: vi.fn() };
        const result = await new JobAnalysisService(provider).analyze(advertisement);
        expect(result.originalText).toBe(advertisement);
    });
});
