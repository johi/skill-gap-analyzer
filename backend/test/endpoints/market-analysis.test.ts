import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '@/app';
import { cleanDatabase } from '../helpers/database';

describe('Market Analysis API', () => {
    let app: ReturnType<typeof buildApp>;

    beforeEach(async () => {
        await cleanDatabase();

        app = buildApp();
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        await cleanDatabase();
    });

    it('returns empty demand when no jobs exist', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-demand',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            totalJobsAnalyzed: 0,
            skills: [],
        });
    });

    it('returns aggregated demand and percentages', async () => {
        const jobs = [
            {
                company: 'Company A',
                skills: [
                    {
                        name: 'PHP',
                        category: 'Programming Languages',
                        requirement: 'must_have',
                    },
                    {
                        name: 'Docker',
                        category: 'DevOps',
                        requirement: 'nice_to_have',
                    },
                ],
            },
            {
                company: 'Company B',
                skills: [
                    {
                        name: 'PHP',
                        category: 'Programming Languages',
                        requirement: 'nice_to_have',
                    },
                ],
            },
        ];

        for (const job of jobs) {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/jobs',
                payload: {
                    dateFound: '2026-10-25',
                    title: 'Backend Developer',
                    ...job,
                },
            });

            expect(response.statusCode).toBe(201);
        }

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-demand',
        });

        expect(response.statusCode).toBe(200);

        const result = response.json();

        expect(result.totalJobsAnalyzed).toBe(2);
        expect(result.skills).toHaveLength(2);

        expect(result.skills).toEqual([
            expect.objectContaining({
                name: 'PHP',
                jobCount: 2,
                mustHaveCount: 1,
                niceToHaveCount: 1,
                demandPercentage: 100,
            }),
            expect.objectContaining({
                name: 'Docker',
                jobCount: 1,
                mustHaveCount: 0,
                niceToHaveCount: 1,
                demandPercentage: 50,
            }),
        ]);
    });

    it('excludes expired jobs from demand analysis', async () => {
        for (const [company, applyStatus] of [
            ['Active Company', 'not_applied'],
            ['Expired Company', 'expired'],
        ] as const) {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/jobs',
                payload: {
                    dateFound: '2026-10-25',
                    company,
                    title: 'Backend Developer',
                    applyStatus,
                    skills: [
                        {
                            name: 'TypeScript',
                            category: 'Programming Languages',
                            requirement: 'must_have',
                        },
                    ],
                },
            });

            expect(response.statusCode).toBe(201);
        }

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-demand',
        });

        expect(response.statusCode).toBe(200);

        const result = response.json();

        expect(result.totalJobsAnalyzed).toBe(1);
        expect(result.skills).toEqual([
            expect.objectContaining({
                name: 'TypeScript',
                jobCount: 1,
                demandPercentage: 100,
            }),
        ]);
    });
});
