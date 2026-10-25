
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

    async function createJob(
        company: string,
        skills: {
            name: string;
            category: string;
            requirement: 'must_have' | 'nice_to_have';
        }[],
        applyStatus: 'not_applied' | 'expired' = 'not_applied'
    ): Promise<void> {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-10-25',
                company,
                title: 'Backend Developer',
                applyStatus,
                skills,
            },
        });

        expect(response.statusCode).toBe(201);
    }

    async function getSkillId(name: string): Promise<number> {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/skills',
        });

        expect(response.statusCode).toBe(200);

        const skill = response.json().find(
            (item: { name: string }) => item.name === name
        );

        expect(skill).toBeDefined();

        return skill.id;
    }

    async function assessSkill(
        name: string,
        level: number
    ): Promise<void> {
        const skillId = await getSkillId(name);

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/user-skills/${skillId}`,
            payload: { level },
        });

        expect(response.statusCode).toBe(200);
    }

    // UC-26: Skill demand

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
        await createJob('Company A', [
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
        ]);

        await createJob('Company B', [
            {
                name: 'PHP',
                category: 'Programming Languages',
                requirement: 'nice_to_have',
            },
        ]);

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
        await createJob('Active Company', [
            {
                name: 'TypeScript',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
        ]);

        await createJob(
            'Expired Company',
            [
                {
                    name: 'TypeScript',
                    category: 'Programming Languages',
                    requirement: 'must_have',
                },
            ],
            'expired'
        );

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-demand',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            totalJobsAnalyzed: 1,
            skills: [
                {
                    name: 'TypeScript',
                    jobCount: 1,
                    demandPercentage: 100,
                },
            ],
        });
    });

    // UC-27: Skill gaps

    it('returns empty skill gaps when no jobs exist', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-gaps',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            totalJobsAnalyzed: 0,
            skills: [],
        });
    });

    it('combines market demand with assessed proficiency', async () => {
        await createJob('Company A', [
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
        ]);

        await createJob('Company B', [
            {
                name: 'PHP',
                category: 'Programming Languages',
                requirement: 'nice_to_have',
            },
        ]);

        await assessSkill('PHP', 5);
        await assessSkill('Docker', 3);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-gaps',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            totalJobsAnalyzed: 2,
            skills: [
                {
                    name: 'PHP',
                    jobCount: 2,
                    demandPercentage: 100,
                    proficiency: 5,
                    gap: 0,
                    status: 'assessed',
                },
                {
                    name: 'Docker',
                    jobCount: 1,
                    demandPercentage: 50,
                    proficiency: 3,
                    gap: 2,
                    status: 'assessed',
                },
            ],
        });
    });

    it('identifies unassessed skills without assigning a gap', async () => {
        await createJob('Company A', [
            {
                name: 'Rust',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
        ]);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-gaps',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            totalJobsAnalyzed: 1,
            skills: [
                {
                    name: 'Rust',
                    proficiency: null,
                    gap: null,
                    status: 'unassessed',
                },
            ],
        });
    });

    it('treats proficiency zero as an assessment', async () => {
        await createJob('Company A', [
            {
                name: 'Kubernetes',
                category: 'DevOps',
                requirement: 'must_have',
            },
        ]);

        await assessSkill('Kubernetes', 0);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-gaps',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            totalJobsAnalyzed: 1,
            skills: [
                {
                    name: 'Kubernetes',
                    proficiency: 0,
                    gap: 5,
                    status: 'assessed',
                },
            ],
        });
    });

    it('excludes expired jobs from skill-gap analysis', async () => {
        await createJob('Active Company', [
            {
                name: 'PHP',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
        ]);

        await createJob(
            'Expired Company',
            [
                {
                    name: 'Rust',
                    category: 'Programming Languages',
                    requirement: 'must_have',
                },
            ],
            'expired'
        );

        await assessSkill('PHP', 4);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-gaps',
        });

        expect(response.statusCode).toBe(200);

        const result = response.json();

        expect(result.totalJobsAnalyzed).toBe(1);
        expect(result.skills).toHaveLength(1);

        expect(result.skills[0]).toMatchObject({
            name: 'PHP',
            proficiency: 4,
            gap: 1,
            demandPercentage: 100,
        });

        expect(
            result.skills.some(
                (skill: { name: string }) => skill.name === 'Rust'
            )
        ).toBe(false);
    });

    // UC-28: Skill priority

    it('reports missing market demand when no jobs exist', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-priorities',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            totalJobsAnalyzed: 0,
            skills: [],
            missingInformation: ['market_demand'],
        });
    });

    it('calculates weighted demand and priority scores', async () => {
        await createJob('Company A', [
            {
                name: 'Docker',
                category: 'DevOps',
                requirement: 'must_have',
            },
            {
                name: 'PHP',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
        ]);

        await createJob('Company B', [
            {
                name: 'Docker',
                category: 'DevOps',
                requirement: 'nice_to_have',
            },
        ]);

        await assessSkill('Docker', 2);
        await assessSkill('PHP', 5);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-priorities',
        });

        expect(response.statusCode).toBe(200);

        const result = response.json();

        expect(result.totalJobsAnalyzed).toBe(2);
        expect(result.missingInformation).toEqual([]);
        expect(result.skills).toHaveLength(2);

        const docker = result.skills[0];
        const php = result.skills[1];

        expect(docker).toMatchObject({
            name: 'Docker',
            jobCount: 2,
            mustHaveCount: 1,
            niceToHaveCount: 1,
            proficiency: 2,
            gap: 3,
            demandWeight: 0.75,
            status: 'assessed',
        });

        const expectedScore = Math.round(
            100 *
            Math.pow(0.75, 0.7) *
            Math.pow(3 / 5, 0.3) *
            10
        ) / 10;

        expect(docker.priorityScore).toBe(expectedScore);

        expect(php).toMatchObject({
            name: 'PHP',
            proficiency: 5,
            gap: 0,
            demandWeight: 0.5,
            priorityScore: 0,
        });
    });

    it('ranks assessed skills by descending priority', async () => {
        await createJob('Company A', [
            {
                name: 'Docker',
                category: 'DevOps',
                requirement: 'must_have',
            },
            {
                name: 'PHP',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
        ]);

        await createJob('Company B', [
            {
                name: 'Docker',
                category: 'DevOps',
                requirement: 'must_have',
            },
        ]);

        await assessSkill('Docker', 2);
        await assessSkill('PHP', 4);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-priorities',
        });

        expect(response.statusCode).toBe(200);

        const result = response.json();

        expect(result.skills.map(
            (skill: { name: string }) => skill.name
        )).toEqual(['Docker', 'PHP']);

        expect(result.skills[0].priorityScore)
            .toBeGreaterThan(result.skills[1].priorityScore);
    });

    it('reports unassessed skills without assigning priority', async () => {
        await createJob('Company A', [
            {
                name: 'Rust',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
            {
                name: 'PHP',
                category: 'Programming Languages',
                requirement: 'must_have',
            },
        ]);

        await assessSkill('PHP', 3);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-priorities',
        });

        expect(response.statusCode).toBe(200);

        const result = response.json();

        expect(result.missingInformation)
            .toContain('skill_assessments');

        expect(result.skills.map(
            (skill: { name: string }) => skill.name
        )).toEqual(['PHP', 'Rust']);

        expect(result.skills[1]).toMatchObject({
            name: 'Rust',
            proficiency: null,
            gap: null,
            priorityScore: null,
            status: 'unassessed',
        });
    });

    it('excludes expired jobs from priority analysis', async () => {
        await createJob('Active Company', [
            {
                name: 'Docker',
                category: 'DevOps',
                requirement: 'must_have',
            },
        ]);

        await createJob(
            'Expired Company',
            [
                {
                    name: 'Rust',
                    category: 'Programming Languages',
                    requirement: 'must_have',
                },
            ],
            'expired'
        );

        await assessSkill('Docker', 2);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/analysis/skill-priorities',
        });

        expect(response.statusCode).toBe(200);

        const result = response.json();

        expect(result.totalJobsAnalyzed).toBe(1);
        expect(result.skills).toHaveLength(1);

        expect(result.skills[0]).toMatchObject({
            name: 'Docker',
            demandWeight: 1,
            proficiency: 2,
            gap: 3,
        });

        expect(result.missingInformation).toEqual([]);
    });
});
