import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '../src/app';
import { db } from '../src/db';

import { SkillRepository } from '../src/repositories/skill-repository';
import { UserSkillRepository } from '../src/repositories/user-skill-repository';

describe('User Skills API', () => {
    let app: ReturnType<typeof buildApp>;
    let skillRepository: SkillRepository;
    let userSkillRepository: UserSkillRepository;
    let skillId: number;

    const testSkillName = '__endpoint_test_user_skill__';

    beforeEach(async () => {
        app = buildApp();

        skillRepository = new SkillRepository(db);
        userSkillRepository = new UserSkillRepository(db);

        const existing =
            await skillRepository.findByName(testSkillName);

        if (existing) {
            await skillRepository.delete(existing.id);
        }

        const skill = await skillRepository.create({
            name: testSkillName,
            category: 'language',
        });

        skillId = skill.id;
    });

    afterEach(async () => {
        const existing =
            await skillRepository.findByName(testSkillName);

        if (existing) {
            await skillRepository.delete(existing.id);
        }

        await app.close();
    });

    it('lists user skills', async () => {
        await userSkillRepository.upsert(skillId, 4);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/user-skills',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toContainEqual(
            expect.objectContaining({
                skillId,
                name: testSkillName,
                category: 'language',
                level: 4,
            })
        );
    });

    it('gets a user skill with a valid skill id', async () => {
        await userSkillRepository.upsert(skillId, 4);

        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/user-skills/${skillId}`,
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            skillId,
            level: 4,
        });
    });

    it('rejects an invalid skill id', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/user-skills/not-a-number',
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it('accepts a valid proficiency level', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/user-skills/${skillId}`,
            payload: {
                level: 3,
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            skillId,
            level: 3,
        });
    });

    it('accepts proficiency level 0', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/user-skills/${skillId}`,
            payload: {
                level: 0,
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            skillId,
            level: 0,
        });
    });

    it('accepts proficiency level 5', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/user-skills/${skillId}`,
            payload: {
                level: 5,
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            skillId,
            level: 5,
        });
    });

    it('rejects proficiency below 0', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/user-skills/${skillId}`,
            payload: {
                level: -1,
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it('rejects proficiency above 5', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/user-skills/${skillId}`,
            payload: {
                level: 6,
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it('rejects a non-integer proficiency level', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/user-skills/${skillId}`,
            payload: {
                level: 3.5,
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it('deletes a user skill assessment', async () => {
        await userSkillRepository.upsert(skillId, 3);

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/user-skills/${skillId}`,
        });

        expect(response.statusCode).toBe(204);

        const deleted =
            await userSkillRepository.findBySkillId(skillId);

        expect(deleted).toBeUndefined();
    });

    it('rejects deletion with an invalid skill id', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/user-skills/not-a-number',
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });
});