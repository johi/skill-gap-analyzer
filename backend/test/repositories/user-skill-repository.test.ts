import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { db } from '../../src/db';
import { SkillRepository } from '../../src/repositories/skill-repository';
import { UserSkillRepository } from '../../src/repositories/user-skill-repository';
import { cleanDatabase } from './helpers';

describe('UserSkillRepository', () => {
    let skillRepository: SkillRepository;
    let repository: UserSkillRepository;

    beforeEach(async () => {
        await cleanDatabase();

        skillRepository = new SkillRepository(db);
        repository = new UserSkillRepository(db);
    });

    afterEach(async () => {
        await cleanDatabase();
    });

    it('creates a user skill assessment using upsert', async () => {
        const skill = await skillRepository.create({
            name: 'TypeScript',
            category: 'language',
        });

        const userSkill = await repository.upsert(
            skill.id,
            3
        );

        expect(userSkill).toMatchObject({
            skillId: skill.id,
            level: 3,
        });
    });

    it('updates an existing user skill assessment using upsert', async () => {
        const skill = await skillRepository.create({
            name: 'TypeScript',
            category: 'language',
        });

        await repository.upsert(skill.id, 2);

        const updated = await repository.upsert(
            skill.id,
            4
        );

        expect(updated).toMatchObject({
            skillId: skill.id,
            level: 4,
        });

        const result = await repository.findBySkillId(
            skill.id
        );

        expect(result?.level).toBe(4);
    });

    it('finds a user skill by skill id', async () => {
        const skill = await skillRepository.create({
            name: 'PostgreSQL',
            category: 'database',
        });

        await repository.upsert(skill.id, 4);

        const result = await repository.findBySkillId(
            skill.id
        );

        expect(result).toMatchObject({
            skillId: skill.id,
            level: 4,
        });
    });

    it('returns undefined for an unknown skill assessment', async () => {
        const result = await repository.findBySkillId(999);

        expect(result).toBeUndefined();
    });

    it('lists assessments with skill information', async () => {
        const typescript = await skillRepository.create({
            name: 'TypeScript',
            category: 'language',
        });

        const postgres = await skillRepository.create({
            name: 'PostgreSQL',
            category: 'database',
        });

        await repository.upsert(typescript.id, 3);
        await repository.upsert(postgres.id, 4);

        const result = await repository.findAll();

        expect(result).toEqual([
            expect.objectContaining({
                skillId: postgres.id,
                name: 'PostgreSQL',
                category: 'database',
                level: 4,
            }),
            expect.objectContaining({
                skillId: typescript.id,
                name: 'TypeScript',
                category: 'language',
                level: 3,
            }),
        ]);
    });

    it('deletes a user skill assessment', async () => {
        const skill = await skillRepository.create({
            name: 'TypeScript',
            category: 'language',
        });

        await repository.upsert(skill.id, 3);

        const deleted = await repository.delete(skill.id);

        expect(deleted).toBe(true);

        const result = await repository.findBySkillId(
            skill.id
        );

        expect(result).toBeUndefined();
    });
});