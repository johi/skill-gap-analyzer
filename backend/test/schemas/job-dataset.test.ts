import {
    describe,
    expect,
    it,
} from 'vitest';

import { jobDatasetSchema } from '../../src/schemas/job-dataset';

describe('jobDatasetSchema', () => {
    const validJob = {
        dateFound: '2026-10-05',
        company: 'Example Company',
        title: 'Senior Backend Developer',
        sourceUrl: 'https://example.com/jobs/123',
        location: 'Copenhagen',
        workModel: 'hybrid',
        employmentType: 'full_time',
        seniority: 'senior',
        primaryRole: 'backend',
        yearsRequired: '5+ years',
        educationRequirement: null,
        languageRequirements: [
            {
                language: 'en',
                requirement: 'required',
            },
        ],
        salaryRate: null,
        interest: 80,
        applyStatus: 'not_applied',
        gapNotes: null,
        originalMatch: 75,
        skills: [
            {
                name: 'TypeScript',
                category: 'language',
                requirement: 'must_have',
            },
        ],
    };

    it('accepts a valid dataset', () => {
        const result = jobDatasetSchema.safeParse({
            version: 1,
            jobs: [validJob],
        });

        expect(result.success).toBe(true);
    });

    it('accepts an exportedAt timestamp', () => {
        const result = jobDatasetSchema.safeParse({
            version: 1,
            exportedAt: '2026-10-05T16:00:00.000Z',
            jobs: [validJob],
        });

        expect(result.success).toBe(true);
    });

    it('accepts an empty dataset', () => {
        const result = jobDatasetSchema.safeParse({
            version: 1,
            jobs: [],
        });

        expect(result.success).toBe(true);
    });

    it('rejects an unsupported dataset version', () => {
        const result = jobDatasetSchema.safeParse({
            version: 2,
            jobs: [validJob],
        });

        expect(result.success).toBe(false);
    });

    it('rejects a dataset without jobs', () => {
        const result = jobDatasetSchema.safeParse({
            version: 1,
        });

        expect(result.success).toBe(false);
    });

    it('rejects an invalid exportedAt timestamp', () => {
        const result = jobDatasetSchema.safeParse({
            version: 1,
            exportedAt: 'yesterday',
            jobs: [validJob],
        });

        expect(result.success).toBe(false);
    });

    it('rejects an invalid job', () => {
        const result = jobDatasetSchema.safeParse({
            version: 1,
            jobs: [
                {
                    ...validJob,
                    company: '',
                },
            ],
        });

        expect(result.success).toBe(false);
    });

    it('rejects an invalid language requirement', () => {
        const result = jobDatasetSchema.safeParse({
            version: 1,
            jobs: [
                {
                    ...validJob,
                    languageRequirements: [
                        {
                            language: 'english',
                            requirement: 'required',
                        },
                    ],
                },
            ],
        });

        expect(result.success).toBe(false);
    });

    it('rejects duplicate language requirements', () => {
        const result = jobDatasetSchema.safeParse({
            version: 1,
            jobs: [
                {
                    ...validJob,
                    languageRequirements: [
                        {
                            language: 'en',
                            requirement: 'required',
                        },
                        {
                            language: 'en',
                            requirement: 'preferred',
                        },
                    ],
                },
            ],
        });

        expect(result.success).toBe(false);
    });

    it('rejects an invalid skill requirement', () => {
        const result = jobDatasetSchema.safeParse({
            version: 1,
            jobs: [
                {
                    ...validJob,
                    skills: [
                        {
                            name: 'TypeScript',
                            category: 'language',
                            requirement: 'important',
                        },
                    ],
                },
            ],
        });

        expect(result.success).toBe(false);
    });
});