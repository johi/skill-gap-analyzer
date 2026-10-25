
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '@/app';
import { cleanDatabase } from '../helpers/database';

describe('Job Match API', () => {
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

    async function createJob(
        skills: Array<{
            name: string;
            category: string;
            requirement: 'must_have' | 'nice_to_have';
        }>
    ): Promise<{
        id: number;
        skills: Array<{ id: number; name: string }>;
    }> {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-10-25',
                company: 'Match Test Company',
                title: 'Backend Developer',
                skills,
            },
        });

        expect(response.statusCode).toBe(201);

        const created = response.json();

        const getResponse = await app.inject({
            method: 'GET',
            url: `/api/v1/jobs/${created.id}`,
        });

        expect(getResponse.statusCode).toBe(200);

        return getResponse.json();
    }

    async function assessSkill(
        skillId: number,
        level: number
    ): Promise<void> {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/user-skills/${skillId}`,
            payload: { level },
        });

        expect(response.statusCode).toBe(200);
    }

    it('calculates a weighted match using stored assessments', async () => {
        const job = await createJob([
            {
                name: 'PHP',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
            {
                name: 'Docker',
                category: 'DevOps',
                requirement: 'must_have',
            },
            {
                name: 'PostgreSQL',
                category: 'Databases',
                requirement: 'nice_to_have',
            },
        ]);

        const php = job.skills.find((skill) => skill.name === 'PHP')!;
        const docker = job.skills.find((skill) => skill.name === 'Docker')!;
        const postgres = job.skills.find(
            (skill) => skill.name === 'PostgreSQL'
        )!;

        await assessSkill(php.id, 4);
        await assessSkill(docker.id, 2);
        await assessSkill(postgres.id, 0);

        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/jobs/${job.id}/match`,
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            matchPercentage: 60,
            assessmentCoverage: 100,
            totalSkills: 3,
            assessedSkills: 3,
            missingInformation: [],
        });
    });

    it('excludes unassessed skills from the match score', async () => {
        const job = await createJob([
            {
                name: 'PHP',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
            {
                name: 'Docker',
                category: 'DevOps',
                requirement: 'must_have',
            },
        ]);

        const php = job.skills.find((skill) => skill.name === 'PHP')!;

        await assessSkill(php.id, 5);

        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/jobs/${job.id}/match`,
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            matchPercentage: 100,
            assessmentCoverage: 50,
            totalSkills: 2,
            assessedSkills: 1,
            missingInformation: ['skill_assessments'],
        });
    });

    it('returns null when no required skills are assessed', async () => {
        const job = await createJob([
            {
                name: 'Rust',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
        ]);

        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/jobs/${job.id}/match`,
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            matchPercentage: null,
            assessmentCoverage: 0,
            totalSkills: 1,
            assessedSkills: 0,
            missingInformation: ['skill_assessments'],
        });
    });

    it('reports missing requirements for jobs without skills', async () => {
        const job = await createJob([]);

        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/jobs/${job.id}/match`,
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            matchPercentage: null,
            assessmentCoverage: 0,
            totalSkills: 0,
            assessedSkills: 0,
            skills: [],
            missingInformation: ['job_skills'],
        });
    });

    it('returns 404 for an unknown job', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs/999999/match',
        });

        expect(response.statusCode).toBe(404);
    });

    it('rejects invalid job IDs', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs/invalid/match',
        });

        expect(response.statusCode).toBe(400);
    });
});
