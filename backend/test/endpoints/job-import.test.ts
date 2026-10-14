
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '@/app';
import { cleanDatabase } from '../helpers/database';

describe('Job import endpoints', () => {
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

    it('analyzes a valid dataset', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
                jobs: [{
                    dateFound: '2026-10-05',
                    company: 'Example Company',
                    title: 'Senior Backend Developer',
                    languageRequirements: [],
                    skills: [],
                }],
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            version: 1,
            totalJobs: 1,
            requiresReview: false,
            jobs: [{
                job: {
                    dateFound: '2026-10-05',
                    company: 'Example Company',
                    title: 'Senior Backend Developer',
                    languageRequirements: [],
                    skills: [],
                },
                skills: [],
            }],
        });
    });

    it('does not persist jobs during import analysis', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
                jobs: [{
                    dateFound: '2026-10-05',
                    company: 'Read Only Test Company',
                    title: 'Backend Developer',
                    languageRequirements: [],
                    skills: [],
                }],
            },
        });

        expect(response.statusCode).toBe(200);

        const jobsResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs',
        });

        expect(jobsResponse.statusCode).toBe(200);
        expect(jobsResponse.json()).toEqual([]);
    });

    it('does not persist new skills during import analysis', async () => {
        const skillName = '__import_analysis_new_skill__';

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
                jobs: [{
                    dateFound: '2026-10-05',
                    company: 'Example Company',
                    title: 'Backend Developer',
                    languageRequirements: [],
                    skills: [{
                        name: skillName,
                        category: 'framework',
                        requirement: 'must_have',
                    }],
                }],
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json().jobs[0].skills).toEqual([
            expect.objectContaining({
                name: skillName,
                resolution: 'new',
                canonicalSkillId: null,
            }),
        ]);

        const skillsResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/skills',
        });

        expect(skillsResponse.statusCode).toBe(200);
        expect(skillsResponse.json()).toEqual([]);
    });

    it('analyzes an empty dataset', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
                jobs: [],
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            version: 1,
            totalJobs: 0,
            requiresReview: false,
            jobs: [],
        });
    });

    it('rejects a dataset with a missing jobs property', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
            issues: expect.arrayContaining([
                expect.objectContaining({
                    path: 'jobs',
                }),
            ]),
        });
    });

    it('rejects an unsupported dataset version', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 2,
                jobs: [],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
            message: 'Request validation failed',
        });
    });

    it('rejects an invalid job and identifies its location', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
                jobs: [{
                    dateFound: '2026-10-05',
                    company: '',
                    title: 'Senior Backend Developer',
                    languageRequirements: [],
                    skills: [],
                }],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
            issues: expect.arrayContaining([
                expect.objectContaining({
                    path: 'jobs.0.company',
                }),
            ]),
        });
    });

    it('resolves an imported skill against the existing skill catalogue', async () => {
        const skillName = 'ImportCanonicalSkill';

        const createSkillResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/skills',
            payload: {
                name: skillName,
                category: 'test',
            },
        });

        expect(createSkillResponse.statusCode).toBe(201);

        const skillId = createSkillResponse.json().id;

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
                jobs: [{
                    dateFound: '2026-10-05',
                    company: 'Example Company',
                    title: 'Senior Backend Developer',
                    languageRequirements: [],
                    skills: [{
                        name: 'importcanonicalskill',
                        category: 'test',
                        requirement: 'must_have',
                    }],
                }],
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json().jobs[0].skills).toEqual([
            {
                name: 'importcanonicalskill',
                category: 'test',
                requirement: 'must_have',
                resolution: 'existing',
                canonicalSkillId: skillId,
                canonicalName: 'ImportCanonicalSkill',
            },
        ]);
    });

    it('requires review when imported skill requirements conflict', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
                jobs: [{
                    dateFound: '2026-10-05',
                    company: 'Example Company',
                    title: 'Senior Backend Developer',
                    languageRequirements: [],
                    skills: [
                        {
                            name: 'Fastify',
                            category: 'framework',
                            requirement: 'must_have',
                        },
                        {
                            name: 'fastify',
                            category: 'framework',
                            requirement: 'nice_to_have',
                        },
                    ],
                }],
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            requiresReview: true,
            jobs: [{
                skills: [{
                    resolution: 'review_required',
                    conflictingRequirements: [
                        'must_have',
                        'nice_to_have',
                    ],
                }],
            }],
        });
    });

    it('rejects an imported job with a missing required field', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
                jobs: [{
                    dateFound: '2026-10-05',
                    title: 'Senior Backend Developer',
                    languageRequirements: [],
                    skills: [],
                }],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
            issues: expect.arrayContaining([
                expect.objectContaining({
                    path: 'jobs.0.company',
                }),
            ]),
        });
    });

    it('rejects an imported job with an invalid skill requirement', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/job-import/analyze',
            payload: {
                version: 1,
                jobs: [{
                    dateFound: '2026-10-05',
                    company: 'Example Company',
                    title: 'Senior Backend Developer',
                    languageRequirements: [],
                    skills: [{
                        name: 'TypeScript',
                        category: 'language',
                        requirement: 'optional',
                    }],
                }],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
            issues: expect.arrayContaining([
                expect.objectContaining({
                    path: 'jobs.0.skills.0.requirement',
                }),
            ]),
        });
    });
});
