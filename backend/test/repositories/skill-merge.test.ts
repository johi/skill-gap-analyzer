import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { jobSkills, jobs, skills, userSkills } from '@/db/schema';
import { SkillRepository } from '@/repositories/skill-repository';
import { cleanDatabase } from '../helpers/database';

const repository = new SkillRepository(db);

async function skill(name: string) {
    return repository.create({ name, category: 'Programming Languages' });
}

async function job(title: string) {
    const [created] = await db.insert(jobs).values({
        dateFound: '2026-10-27', company: 'Merge Test Company', title,
    }).returning();
    return created;
}

async function associations(jobId: number) {
    return db.select({ skillId: jobSkills.skillId, requirement: jobSkills.requirement })
        .from(jobSkills)
        .where(eq(jobSkills.jobId, jobId))
        .orderBy(asc(jobSkills.skillId));
}

describe('SkillRepository.merge', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    afterEach(async () => {
        await db.execute(sql`DROP TRIGGER IF EXISTS uc43_fail_skill_delete ON skills`);
        await db.execute(sql`DROP FUNCTION IF EXISTS uc43_reject_skill_delete()`);
        await cleanDatabase();
    });

    it('merges multiple source skills into a target and deletes source proficiency assessments', async () => {
        const sourceA = await skill('API-design');
        const sourceB = await skill('APIs');
        const target = await skill('API Design');
        const firstJob = await job('Backend Engineer');
        const secondJob = await job('API Engineer');
        await db.insert(jobSkills).values([
            { jobId: firstJob.id, skillId: sourceA.id, requirement: 'must_have' },
            { jobId: secondJob.id, skillId: sourceB.id, requirement: 'nice_to_have' },
        ]);
        await db.insert(userSkills).values([
            { skillId: sourceA.id, level: 5 },
            { skillId: sourceB.id, level: 4 },
            { skillId: target.id, level: 2 },
        ]);

        await repository.merge([sourceA.id, sourceB.id], target.id);

        expect(await associations(firstJob.id)).toEqual([
            { skillId: target.id, requirement: 'must_have' },
        ]);
        expect(await associations(secondJob.id)).toEqual([
            { skillId: target.id, requirement: 'nice_to_have' },
        ]);
        expect(await repository.findById(sourceA.id)).toBeUndefined();
        expect(await repository.findById(sourceB.id)).toBeUndefined();
        expect(await repository.findById(target.id)).toBeDefined();
        expect(await db.select().from(userSkills)).toMatchObject([
            { skillId: target.id, level: 2 },
        ]);
    });

    it('drops duplicate source associations and preserves the existing target requirement', async () => {
        const sourceA = await skill('API-design');
        const sourceB = await skill('APIs');
        const target = await skill('API Design');
        const firstJob = await job('Backend Engineer');
        const secondJob = await job('API Engineer');
        await db.insert(jobSkills).values([
            { jobId: firstJob.id, skillId: target.id, requirement: 'nice_to_have' },
            { jobId: firstJob.id, skillId: sourceA.id, requirement: 'must_have' },
            { jobId: firstJob.id, skillId: sourceB.id, requirement: 'must_have' },
            { jobId: secondJob.id, skillId: sourceA.id, requirement: 'nice_to_have' },
            { jobId: secondJob.id, skillId: sourceB.id, requirement: 'must_have' },
        ]);

        await repository.merge([sourceA.id, sourceB.id], target.id);

        // Existing target association wins, even when source was must_have.
        expect(await associations(firstJob.id)).toEqual([
            { skillId: target.id, requirement: 'nice_to_have' },
        ]);
        // When multiple sources overlap without an original target, the first
        // transferred association is retained; remaining source rows are dropped.
        expect(await associations(secondJob.id)).toEqual([
            { skillId: target.id, requirement: 'nice_to_have' },
        ]);
    });

    it('does not alter associations when a requested skill is missing', async () => {
        const source = await skill('APIs');
        const target = await skill('API Design');
        const existingJob = await job('Backend Engineer');
        await db.insert(jobSkills).values({
            jobId: existingJob.id, skillId: source.id, requirement: 'must_have',
        });

        await expect(repository.merge([source.id, 999999], target.id)).rejects.toThrow();
        expect(await associations(existingJob.id)).toEqual([
            { skillId: source.id, requirement: 'must_have' },
        ]);
        expect(await repository.findById(source.id)).toBeDefined();
    });

    it('rolls back updated job associations if deleting a source fails', async () => {
        const source = await skill('APIs');
        const target = await skill('API Design');
        const existingJob = await job('Backend Engineer');
        await db.insert(jobSkills).values({
            jobId: existingJob.id, skillId: source.id, requirement: 'must_have',
        });
        await db.insert(userSkills).values({ skillId: source.id, level: 4 });

        await db.execute(sql`
            CREATE FUNCTION uc43_reject_skill_delete() RETURNS trigger
            LANGUAGE plpgsql AS $$
            BEGIN
                RAISE EXCEPTION 'UC43 simulated delete failure';
            END;
            $$
        `);
        await db.execute(sql`
            CREATE TRIGGER uc43_fail_skill_delete
            BEFORE DELETE ON skills
            FOR EACH ROW EXECUTE FUNCTION uc43_reject_skill_delete()
        `);

        await expect(repository.merge([source.id], target.id))
            .rejects.toThrow();
        expect(await associations(existingJob.id)).toEqual([
            { skillId: source.id, requirement: 'must_have' },
        ]);
        expect(await repository.findById(source.id)).toBeDefined();
        expect(await db.select().from(userSkills).where(eq(userSkills.skillId, source.id)))
            .toMatchObject([{ skillId: source.id, level: 4 }]);
    });
});
