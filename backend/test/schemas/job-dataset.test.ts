import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    jobDatasetSchema,
    reviewedImportSchema,
} from '@/schemas/job-dataset';

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
        if (result.success) {
            expect(result.data.jobs[0]).not.toHaveProperty('originalMatch');
        }
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

    describe('reviewedImportSchema', () => {
        it('accepts reviewed jobs with exclusion decisions', () => {
            const result = reviewedImportSchema.safeParse({
                version: 1,
                jobs: [
                    {
                        jobIndex: 0,
                        excluded: false,
                        job: {
                            dateFound: '2026-10-05',
                            company: 'Example Company',
                            title: 'Senior Backend Developer',
                            skills: [],
                        },
                    },
                    {
                        jobIndex: 1,
                        excluded: true,
                        job: {
                            dateFound: '2026-10-06',
                            company: 'Another Company',
                            title: 'Backend Developer',
                            skills: [],
                        },
                    },
                ],
            });

            expect(result.success).toBe(true);
        });

        it('rejects a negative job index', () => {
            const result = reviewedImportSchema.safeParse({
                version: 1,
                jobs: [
                    {
                        jobIndex: -1,
                        excluded: false,
                        job: {
                            dateFound: '2026-10-05',
                            company: 'Example Company',
                            title: 'Senior Backend Developer',
                            skills: [],
                        },
                    },
                ],
            });

            expect(result.success).toBe(false);
        });

        it('rejects a missing exclusion decision', () => {
            const result = reviewedImportSchema.safeParse({
                version: 1,
                jobs: [
                    {
                        jobIndex: 0,
                    },
                ],
            });

            expect(result.success).toBe(false);
        });

        it('rejects duplicate job indexes', () => {
            const result = reviewedImportSchema.safeParse({
                version: 1,
                jobs: [
                    {
                        jobIndex: 0,
                        excluded: false,
                        job: {
                            dateFound: '2026-10-05',
                            company: 'Example Company',
                            title: 'Senior Backend Developer',
                            skills: [],
                        },
                    },
                    {
                        jobIndex: 0,
                        excluded: true,
                        job: {
                            dateFound: '2026-10-06',
                            company: 'Another Company',
                            title: 'Backend Developer',
                            skills: [],
                        },
                    },
                ],
            });

            expect(result.success).toBe(false);

            if (!result.success) {
                expect(result.error.issues).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            path: ['jobs', 1, 'jobIndex'],
                            message: 'Duplicate job index',
                        }),
                    ])
                );
            }
        });
    });
});
