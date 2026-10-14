
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { ApiError } from '@/api/client';

import {
    analyzeJobImport,
    commitJobImport,
} from '@/api/job-import';

import type {
    JobDataset,
    ReviewedImport,
} from '@/schemas/job-import';

const job = {
    dateFound: '2026-10-14',
    company: 'Example Company',
    title: 'Senior Backend Developer',
    languageRequirements: [],
    skills: [
        {
            name: 'TypeScript',
            category: 'Programming',
            requirement: 'must_have' as const,
        },
    ],
};

const dataset: JobDataset = {
    version: 1,
    jobs: [job],
};

const reviewedImport: ReviewedImport = {
    version: 1,
    jobs: [
        {
            jobIndex: 0,
            excluded: false,
            job,
        },
    ],
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('UC-34: Analyze job import API', () => {
    it('posts the dataset to the analysis endpoint', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    version: 1,
                    totalJobs: 1,
                    requiresReview: false,
                    jobs: [
                        {
                            job,
                            skills: [
                                {
                                    name: 'TypeScript',
                                    category: 'Programming',
                                    requirement: 'must_have',
                                    resolution: 'new',
                                    canonicalSkillId: null,
                                    canonicalName: 'TypeScript',
                                },
                            ],
                        },
                    ],
                }),
                { status: 200 }
            )
        );

        vi.stubGlobal('fetch', fetchMock);

        const result = await analyzeJobImport(dataset);

        expect(fetchMock).toHaveBeenCalledOnce();

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/v1/job-import/analyze',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataset),
            })
        );

        expect(result.totalJobs).toBe(1);
        expect(result.jobs[0]?.skills[0]?.resolution).toBe('new');
    });

    it('reports backend validation errors', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        error: 'validation_error',
                        message: 'Invalid dataset',
                        issues: [
                            {
                                path: 'jobs.0.company',
                                message: 'Required',
                                code: 'invalid_type',
                            },
                        ],
                    }),
                    { status: 400 }
                )
            )
        );

        await expect(analyzeJobImport(dataset)).rejects.toMatchObject({
            status: 400,
            error: 'validation_error',
            issues: [
                expect.objectContaining({
                    path: 'jobs.0.company',
                }),
            ],
        });
    });

    it('rejects malformed analysis responses', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        version: 1,
                        totalJobs: 'invalid',
                        requiresReview: false,
                        jobs: [],
                    }),
                    { status: 200 }
                )
            )
        );

        await expect(analyzeJobImport(dataset)).rejects.toThrow();
    });
});

describe('UC-35: Commit reviewed import API', () => {
    it('submits the original dataset and reviewed decisions', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    imported: 1,
                    excluded: 0,
                    jobIds: [42],
                }),
                { status: 201 }
            )
        );

        vi.stubGlobal('fetch', fetchMock);

        const result = await commitJobImport(
            dataset,
            reviewedImport
        );

        expect(fetchMock).toHaveBeenCalledOnce();

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/v1/jobs/import/commit',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dataset,
                    reviewedImport,
                }),
            })
        );

        expect(result).toEqual({
            imported: 1,
            excluded: 0,
            jobIds: [42],
        });
    });

    it('preserves original indices and exclusion decisions', async () => {
        const decisions: ReviewedImport = {
            version: 1,
            jobs: [
                { jobIndex: 2, excluded: false, job },
                { jobIndex: 0, excluded: true, job },
                { jobIndex: 1, excluded: true, job },
            ],
        };

        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    imported: 1,
                    excluded: 2,
                    jobIds: [99],
                }),
                { status: 201 }
            )
        );

        vi.stubGlobal('fetch', fetchMock);

        await commitJobImport(dataset, decisions);

        const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
        const payload = JSON.parse(options.body as string);

        expect(
            payload.reviewedImport.jobs.map(
                (item: { jobIndex: number }) => item.jobIndex
            )
        ).toEqual([2, 0, 1]);

        expect(
            payload.reviewedImport.jobs.map(
                (item: { excluded: boolean }) => item.excluded
            )
        ).toEqual([false, true, true]);
    });

    it('propagates backend commit conflicts', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        error: 'conflict',
                        message: 'Import conflict',
                    }),
                    { status: 409 }
                )
            )
        );

        await expect(
            commitJobImport(dataset, reviewedImport)
        ).rejects.toBeInstanceOf(ApiError);
    });

    it('rejects invalid commit responses', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        imported: -1,
                        excluded: 0,
                        jobIds: [],
                    }),
                    { status: 201 }
                )
            )
        );

        await expect(
            commitJobImport(dataset, reviewedImport)
        ).rejects.toThrow();
    });
});
