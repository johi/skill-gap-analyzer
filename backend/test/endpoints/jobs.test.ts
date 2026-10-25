import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '@/app';
import { cleanDatabase } from '../helpers/database';

describe('Jobs API', () => {
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

    it('accepts a valid job', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                interest: 80,
                skills: [
                    {
                        name: 'TypeScript',
                        category: 'Language',
                        requirement: 'must_have',
                    },
                    {
                        name: 'PostgreSQL',
                        category: 'Database',
                        requirement: 'nice_to_have',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(201);
    });

    it('rejects interest above 100', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                interest: 101,
                skills: [],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it.each([
        ['workModel', 'sometimes_remote'],
        ['employmentType', 'freelance-ish'],
        ['seniority', 'very_senior'],
        ['applyStatus', 'considering'],
    ])(
        'rejects invalid %s',
        async (field, value) => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/jobs',
                payload: {
                    dateFound: '2026-09-20',
                    company: 'Example Company',
                    title: 'Senior Backend Developer',
                    skills: [],
                    [field]: value,
                },
            });

            expect(response.statusCode).toBe(400);

            expect(response.json()).toMatchObject({
                error: 'validation_error',
            });
        }
    );

    it('rejects an invalid skill requirement', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                skills: [
                    {
                        name: 'TypeScript',
                        category: 'Language',
                        requirement: 'sort_of_important',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('rejects an invalid language code', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                languageRequirements: [
                    {
                        language: 'danish',
                        requirement: 'required',
                    },
                ],
                skills: [],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it('rejects an invalid language requirement', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                languageRequirements: [
                    {
                        language: 'da',
                        requirement: 'maybe',
                    },
                ],
                skills: [],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it('rejects duplicate language requirements', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
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
                skills: [],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it('rejects an invalid job id', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs/nope',
        });

        expect(response.statusCode).toBe(400);
    });

    it('returns jobs using the canonical API contract', async () => {
        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                workModel: 'hybrid',
                employmentType: 'full_time',
                seniority: 'senior',
                languageRequirements: [
                    {
                        language: 'en',
                        requirement: 'required',
                    },
                    {
                        language: 'da',
                        requirement: 'preferred',
                    },
                ],
                applyStatus: 'not_applied',
                skills: [],
            },
        });

        expect(createResponse.statusCode).toBe(201);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json().data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    workModel: 'hybrid',
                    employmentType: 'full_time',
                    seniority: 'senior',
                    languageRequirements: expect.arrayContaining([
                        {
                            language: 'en',
                            requirement: 'required',
                        },
                        {
                            language: 'da',
                            requirement: 'preferred',
                        },
                    ]),
                    applyStatus: 'not_applied',
                }),
            ])
        );
    });

    it('commits reviewed job imports', async () => {
        const job = {
            dateFound: '2026-10-14',
            company: 'Import Test Company',
            title: 'Senior Backend Developer',
            languageRequirements: [],
            skills: [],
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs: [job],
                },
                reviewedImport: {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 0,
                            excluded: false,
                            job,
                        },
                    ],
                },
            },
        });

        expect(response.statusCode).toBe(201);

        expect(response.json()).toMatchObject({
            imported: 1,
            excluded: 0,
            jobIds: [expect.any(Number)],
        });
    });

    it('rejects an import commit with incomplete review decisions', async () => {
        const jobs = [
            {
                dateFound: '2026-10-14',
                company: 'Company A',
                title: 'Backend Developer',
                skills: [],
            },
            {
                dateFound: '2026-10-14',
                company: 'Company B',
                title: 'Frontend Developer',
                skills: [],
            },
        ];

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs,
                },
                reviewedImport: {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 0,
                            excluded: false,
                            job: jobs[0],
                        },
                    ],
                },
            },
        });

        expect(response.statusCode).toBe(400);

        const jobsResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs',
        });

        expect(jobsResponse.statusCode).toBe(200);
        expect(jobsResponse.json().data).toEqual([]);
    });

    it('rejects duplicate review decisions', async () => {
        const job = {
            dateFound: '2026-10-14',
            company: 'Example Company',
            title: 'Backend Developer',
            skills: [],
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs: [job],
                },
                reviewedImport: {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 0,
                            excluded: false,
                            job,
                        },
                        {
                            jobIndex: 0,
                            excluded: false,
                            job,
                        },
                    ],
                },
            },
        });

        expect(response.statusCode).toBe(400);

        const jobsResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs',
        });

        expect(jobsResponse.statusCode).toBe(200);
        expect(jobsResponse.json().data).toEqual([]);
    });

    it('rejects an import commit with an unknown job index', async () => {
        const job = {
            dateFound: '2026-10-14',
            company: 'Example Company',
            title: 'Backend Developer',
            skills: [],
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs: [job],
                },
                reviewedImport: {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 99,
                            excluded: false,
                            job,
                        },
                    ],
                },
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toMatchObject({
            error: 'validation_error',
            message: 'Missing review decision for job index 0',
        });

        const jobsResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs',
        });

        expect(jobsResponse.statusCode).toBe(200);
        expect(jobsResponse.json().data).toEqual([]);
    });

    it('rejects an import commit with an invalid dataset version', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 2,
                    jobs: [],
                },
                reviewedImport: {
                    version: 1,
                    jobs: [],
                },
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it('does not import excluded jobs', async () => {
        const jobs = [
            {
                dateFound: '2026-10-14',
                company: 'Included Company',
                title: 'Backend Developer',
                skills: [],
            },
            {
                dateFound: '2026-10-14',
                company: 'Excluded Company',
                title: 'Frontend Developer',
                skills: [],
            },
        ];

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs,
                },
                reviewedImport: {
                    version: 1,
                    jobs: jobs.map((job, jobIndex) => ({
                        jobIndex,
                        excluded: jobIndex === 1,
                        job,
                    })),
                },
            },
        });

        expect(response.statusCode).toBe(201);

        const result = response.json();

        expect(result.imported).toBe(1);
        expect(result.excluded).toBe(1);
        expect(result.jobIds).toHaveLength(1);

        const listResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs',
        });

        expect(listResponse.statusCode).toBe(200);

        const importedJob = listResponse.json().data.find(
            (job: { id: number }) => job.id === result.jobIds[0]
        );

        expect(importedJob).toMatchObject({
            company: 'Included Company',
        });

        expect(
            listResponse.json().data.some(
                (job: { id: number; company: string }) =>
                    result.jobIds.includes(job.id) &&
                    job.company === 'Excluded Company'
            )
        ).toBe(false);
    });

    it('accepts an import with all jobs excluded', async () => {
        const jobs = [
            {
                dateFound: '2026-10-14',
                company: 'Company A',
                title: 'Backend Developer',
                skills: [],
            },
            {
                dateFound: '2026-10-14',
                company: 'Company B',
                title: 'Frontend Developer',
                skills: [],
            },
        ];

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs,
                },
                reviewedImport: {
                    version: 1,
                    jobs: jobs.map((job, jobIndex) => ({
                        jobIndex,
                        excluded: true,
                        job,
                    })),
                },
            },
        });

        expect(response.statusCode).toBe(201);
        expect(response.json()).toEqual({
            imported: 0,
            excluded: 2,
            jobIds: [],
        });

        const jobsResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs',
        });

        expect(jobsResponse.statusCode).toBe(200);
        expect(jobsResponse.json().data).toEqual([]);
    });

    it('persists corrections made during import review', async () => {
        const originalJob = {
            dateFound: '2026-10-14',
            company: 'Example Company',
            title: 'Backend Developer',
            skills: [],
        };

        const correctedJob = {
            ...originalJob,
            title: 'Senior Backend Developer',
            interest: 90,
            skills: [
                {
                    name: 'TypeScript',
                    category: 'Language',
                    requirement: 'must_have',
                },
            ],
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs: [originalJob],
                },
                reviewedImport: {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 0,
                            excluded: false,
                            job: correctedJob,
                        },
                    ],
                },
            },
        });

        expect(response.statusCode).toBe(201);

        const { jobIds } = response.json();

        expect(jobIds).toHaveLength(1);

        const getResponse = await app.inject({
            method: 'GET',
            url: `/api/v1/jobs/${jobIds[0]}`,
        });

        expect(getResponse.statusCode).toBe(200);

        expect(getResponse.json()).toMatchObject({
            company: 'Example Company',
            title: 'Senior Backend Developer',
            interest: 90,
            skills: [
                expect.objectContaining({
                    name: 'TypeScript',
                    category: 'Language',
                    requirement: 'must_have',
                }),
            ],
        });
    });

    it('reuses existing skills during import', async () => {
        const skillName = 'ImportReuseEndpointTestSkill20261014';

        const existingSkillResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/skills',
            payload: {
                name: skillName,
                category: 'Framework',
            },
        });

        expect(existingSkillResponse.statusCode).toBe(201);

        const existingSkillId = existingSkillResponse.json().id;

        const job = {
            dateFound: '2026-10-14',
            company: 'Skill Reuse Test Company',
            title: 'Backend Developer',
            skills: [
                {
                    name: skillName,
                    category: 'Framework',
                    requirement: 'must_have',
                },
            ],
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs: [job],
                },
                reviewedImport: {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 0,
                            excluded: false,
                            job,
                        },
                    ],
                },
            },
        });

        expect(response.statusCode).toBe(201);

        const { jobIds } = response.json();

        const getResponse = await app.inject({
            method: 'GET',
            url: `/api/v1/jobs/${jobIds[0]}`,
        });

        expect(getResponse.statusCode).toBe(200);

        expect(getResponse.json().skills).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: existingSkillId,
                    name: skillName,
                    requirement: 'must_have',
                }),
            ])
        );
    });

    it('normalizes skill names during import', async () => {
        const existingSkillResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/skills',
            payload: {
                name: 'ImportCaseTestSkill20261014',
                category: 'Language',
            },
        });

        expect(existingSkillResponse.statusCode).toBe(201);

        const existingSkillId = existingSkillResponse.json().id;

        const job = {
            dateFound: '2026-10-14',
            company: 'Skill Normalization Test Company',
            title: 'Backend Developer',
            skills: [
                {
                    name: 'importcasetestskill20261014',
                    category: 'Language',
                    requirement: 'must_have',
                },
            ],
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs: [job],
                },
                reviewedImport: {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 0,
                            excluded: false,
                            job,
                        },
                    ],
                },
            },
        });

        expect(response.statusCode).toBe(201);

        const { jobIds } = response.json();

        const getResponse = await app.inject({
            method: 'GET',
            url: `/api/v1/jobs/${jobIds[0]}`,
        });

        expect(getResponse.statusCode).toBe(200);

        expect(getResponse.json().skills).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: existingSkillId,
                    name: 'ImportCaseTestSkill20261014',
                    requirement: 'must_have',
                }),
            ])
        );
    });

    it('rejects an import with unresolved skill conflicts', async () => {
        const job = {
            dateFound: '2026-10-14',
            company: 'Example Company',
            title: 'Backend Developer',
            skills: [
                {
                    name: 'Fastify',
                    category: 'Framework',
                    requirement: 'must_have',
                },
                {
                    name: 'fastify',
                    category: 'Framework',
                    requirement: 'nice_to_have',
                },
            ],
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs: [job],
                },
                reviewedImport: {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 0,
                            excluded: false,
                            job,
                        },
                    ],
                },
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toMatchObject({
            error: 'validation_error',
            message: 'Job index 0 contains unresolved skill conflicts',
        });

        const jobsResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs',
        });

        expect(jobsResponse.statusCode).toBe(200);
        expect(jobsResponse.json().data).toEqual([]);
    });

    it('commits an import after resolving skill conflicts during review', async () => {
        const originalJob = {
            dateFound: '2026-10-14',
            company: 'Example Company',
            title: 'Backend Developer',
            skills: [
                {
                    name: 'Fastify',
                    category: 'Framework',
                    requirement: 'must_have',
                },
                {
                    name: 'fastify',
                    category: 'Framework',
                    requirement: 'nice_to_have',
                },
            ],
        };

        const reviewedJob = {
            ...originalJob,
            skills: [
                {
                    name: 'Fastify',
                    category: 'Framework',
                    requirement: 'must_have',
                },
            ],
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs/import/commit',
            payload: {
                dataset: {
                    version: 1,
                    jobs: [originalJob],
                },
                reviewedImport: {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 0,
                            excluded: false,
                            job: reviewedJob,
                        },
                    ],
                },
            },
        });

        expect(response.statusCode).toBe(201);
        expect(response.json()).toMatchObject({
            imported: 1,
            excluded: 0,
        });

        const { jobIds } = response.json();

        expect(jobIds).toHaveLength(1);

        const jobResponse = await app.inject({
            method: 'GET',
            url: `/api/v1/jobs/${jobIds[0]}`,
        });

        expect(jobResponse.statusCode).toBe(200);
        expect(jobResponse.json()).toMatchObject({
            company: 'Example Company',
            title: 'Backend Developer',
            skills: [
                {
                    name: 'Fastify',
                    requirement: 'must_have',
                },
            ],
        });
    });
    it('filters, sorts and paginates jobs', async () => {
        for (const [company, interest, workModel] of [
            ['Alpha', 60, 'hybrid'],
            ['Beta', 90, 'hybrid'],
            ['Gamma', 70, 'remote'],
        ] as const) {
            const response = await app.inject({
                method: 'POST', url: '/api/v1/jobs',
                payload: { dateFound: '2026-10-14', company,
                    title: 'Backend Engineer', interest, workModel, skills: [] },
            });
            expect(response.statusCode).toBe(201);
        }

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs?search=backend&workModel=hybrid&sortBy=interest&sortOrder=desc&page=1&pageSize=10',
        });
        expect(response.statusCode).toBe(200);
        expect(response.json().data.map((job: { company: string }) => job.company))
            .toEqual(['Beta', 'Alpha']);
        expect(response.json().pagination).toEqual({
            page: 1, pageSize: 10, totalItems: 2, totalPages: 1,
        });
    });

    it('rejects invalid pagination and sorting parameters', async () => {
        for (const query of ['page=0', 'pageSize=7', 'sortBy=salary', 'sortOrder=random']) {
            const response = await app.inject({ method: 'GET', url: `/api/v1/jobs?${query}` });
            expect(response.statusCode).toBe(400);
        }
    });

    it('returns dynamically calculated match and coverage in job listings', async () => {
        const created = await app.inject({ method: 'POST', url: '/api/v1/jobs', payload: {
            dateFound: '2026-10-20', company: 'Match Example', title: 'Developer',
            skills: [{ name: 'UC30 Test Skill', category: 'Programming Languages', requirement: 'must_have' }],
        }});
        expect(created.statusCode).toBe(201);
        const response = await app.inject({ method: 'GET', url: '/api/v1/jobs?sortBy=matchPercentage' });
        expect(response.statusCode).toBe(200);
        expect(response.json().data).toEqual([expect.objectContaining({
            company: 'Match Example', matchPercentage: null, assessmentCoverage: 0,
        })]);
    });

});
