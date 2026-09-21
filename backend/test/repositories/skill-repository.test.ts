import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { db } from '../../src/db';
import { SkillRepository } from '../../src/repositories/skill-repository';
import { cleanDatabase } from './helpers';

describe('SkillRepository', () => {
    let repository: SkillRepository;

    beforeEach(async () => {
        await cleanDatabase();
        repository = new SkillRepository(db);
    });

    afterEach(async () => {
        await cleanDatabase();
    });

    it('creates a skill', async () => {
        const skill = await repository.create({
            name: 'PostgreSQL',
            category: 'database',
        });

        expect(skill).toMatchObject({
            id: 1,
            name: 'PostgreSQL',
            category: 'database',
        });
    });

    it('finds a skill by id', async () => {
        const created = await repository.create({
            name: 'TypeScript',
            category: 'language',
        });

        const skill = await repository.findById(created.id);

        expect(skill).toMatchObject({
            id: created.id,
            name: 'TypeScript',
            category: 'language',
        });
    });

    it('returns undefined when a skill does not exist', async () => {
        const skill = await repository.findById(999);

        expect(skill).toBeUndefined();
    });

    it('finds a skill by name case-insensitively', async () => {
        await repository.create({
            name: 'PostgreSQL',
            category: 'database',
        });

        const skill = await repository.findByName('postgresql');

        expect(skill).toMatchObject({
            name: 'PostgreSQL',
        });
    });

    it('returns skills ordered by name', async () => {
        await repository.create({
            name: 'TypeScript',
            category: 'language',
        });

        await repository.create({
            name: 'Docker',
            category: 'devops',
        });

        await repository.create({
            name: 'PostgreSQL',
            category: 'database',
        });

        const result = await repository.findAll();

        expect(result.map((skill) => skill.name)).toEqual([
            'Docker',
            'PostgreSQL',
            'TypeScript',
        ]);
    });

    it('updates a skill', async () => {
        const created = await repository.create({
            name: 'Postgres',
            category: 'database',
        });

        const updated = await repository.update(created.id, {
            name: 'PostgreSQL',
        });

        expect(updated).toMatchObject({
            id: created.id,
            name: 'PostgreSQL',
            category: 'database',
        });
    });

    it('deletes a skill', async () => {
        const created = await repository.create({
            name: 'PostgreSQL',
            category: 'database',
        });

        const deleted = await repository.delete(created.id);

        expect(deleted).toBe(true);

        const result = await repository.findById(created.id);

        expect(result).toBeUndefined();
    });

    it('returns false when deleting a nonexistent skill', async () => {
        const deleted = await repository.delete(999);

        expect(deleted).toBe(false);
    });
});