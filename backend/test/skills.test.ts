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

describe('Skills API', () => {
    let app: ReturnType<typeof buildApp>;
    let skillRepository: SkillRepository;

    const testSkillName = '__endpoint_test_postgresql__';

    beforeEach(async () => {
        app = buildApp();
        skillRepository = new SkillRepository(db);

        const existing =
            await skillRepository.findByName(testSkillName);

        if (existing) {
            await skillRepository.delete(existing.id);
        }
    });

    afterEach(async () => {
        const existing =
            await skillRepository.findByName(testSkillName);

        if (existing) {
            await skillRepository.delete(existing.id);
        }

        await app.close();
    });

    it('creates a valid skill', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/skills',
            payload: {
                name: testSkillName,
                category: 'database',
            },
        });

        expect(response.statusCode).toBe(201);

        expect(response.json()).toMatchObject({
            name: testSkillName,
            category: 'database',
        });

        expect(response.json().id).toBeTypeOf('number');
    });

    it('rejects an empty skill name', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/skills',
            payload: {
                name: '',
                category: 'database',
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it('rejects an invalid skill id', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/skills/not-a-number',
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });
});