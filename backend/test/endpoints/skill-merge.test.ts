import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';
import { db } from '@/db';
import { jobSkills, jobs, skills } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cleanDatabase } from '../helpers/database';

describe('Skills API merge', () => {
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

    it('merges multiple sources and returns 204', async () => {
        const [sourceA, sourceB, target] = await db.insert(skills).values([
            { name: 'API-design', category: 'Software Development' },
            { name: 'APIs', category: 'Software Development' },
            { name: 'API Design', category: 'Software Development' },
        ]).returning();
        const [job] = await db.insert(jobs).values({
            dateFound: '2026-10-27', company: 'Merge Test', title: 'API Engineer',
        }).returning();
        await db.insert(jobSkills).values({
            jobId: job.id, skillId: sourceA.id, requirement: 'must_have',
        });

        const response = await app.inject({
            method: 'POST', url: '/api/v1/skills/merge',
            payload: { sourceIds: [sourceA.id, sourceB.id], targetId: target.id },
        });

        expect(response.statusCode).toBe(204);
        const remaining = await db.select().from(skills);
        expect(remaining.map(skill => skill.id)).toEqual([target.id]);
        const associations = await db.select().from(jobSkills).where(eq(jobSkills.jobId, job.id));
        expect(associations).toMatchObject([{ skillId: target.id, requirement: 'must_have' }]);
    });

    it.each([
        { sourceIds: [], targetId: 2 },
        { sourceIds: [1, 1], targetId: 2 },
        { sourceIds: [1], targetId: 1 },
        { sourceIds: ['1'], targetId: 2 },
        { sourceIds: [1], targetId: -1 },
    ])('rejects invalid input with 400: %j', async payload => {
        const response = await app.inject({
            method: 'POST', url: '/api/v1/skills/merge', payload,
        });
        expect(response.statusCode).toBe(400);
    });

    it('returns 404 when a source or target skill does not exist', async () => {
        const [source] = await db.insert(skills).values({
            name: 'API-design', category: 'Software Development',
        }).returning();
        const response = await app.inject({
            method: 'POST', url: '/api/v1/skills/merge',
            payload: { sourceIds: [source.id], targetId: 999999 },
        });
        expect(response.statusCode).toBe(404);
        expect(await db.select().from(skills)).toHaveLength(1);
    });
});
