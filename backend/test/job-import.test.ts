import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '@/app';

describe('Job import endpoints', () => {
    const app = buildApp();

    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
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

        const skillsResponse = await app.inject({
            method: 'GET',
            url: '/api/v1/skills',
        });

        expect(skillsResponse.statusCode).toBe(200);

        const existingSkill = skillsResponse
            .json()
            .find(
                (skill: { id: number; name: string }) =>
                    skill.name.toLowerCase() ===
                    skillName.toLowerCase()
            );

        let skillId: number;

        if (existingSkill) {
            skillId = existingSkill.id;
        } else {
            const createSkillResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/skills',
                payload: {
                    name: skillName,
                    category: 'test',
                },
            });

            expect(createSkillResponse.statusCode).toBe(201);

            skillId = createSkillResponse.json().id;
        }

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
});