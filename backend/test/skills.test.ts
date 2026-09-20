import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '../src/app';

describe('Skills API', () => {
    let app: ReturnType<typeof buildApp>;

    beforeEach(() => {
        app = buildApp();
    });

    afterEach(async () => {
        await app.close();
    });

    it('accepts a valid skill', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/skills',
            payload: {
                name: 'PostgreSQL',
                category: 'database',
            },
        });

        expect(response.statusCode).toBe(201);

        expect(response.json()).toEqual({
            message: 'Create skill',
            input: {
                name: 'PostgreSQL',
                category: 'database',
            },
        });
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
            message: 'Request validation failed',
        });
    });

    it('rejects an invalid skill id', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/skills/banana',
        });

        expect(response.statusCode).toBe(400);
    });
});