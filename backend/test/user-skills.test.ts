import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '../src/app';

describe('User Skills API', () => {
    let app: ReturnType<typeof buildApp>;

    beforeEach(() => {
        app = buildApp();
    });

    afterEach(async () => {
        await app.close();
    });

    it('lists user skills', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/user-skills',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            message: 'List user skills',
        });
    });

    it('gets a user skill with a valid skill id', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/user-skills/42',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            message: 'Get user skill',
            skillId: 42,
        });
    });

    it('rejects an invalid skill id', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/user-skills/banana',
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
            message: 'Request validation failed',
        });
    });

    it('accepts a valid proficiency level', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/user-skills/42',
            payload: {
                level: 4,
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            message: 'Set user skill',
            skillId: 42,
            input: {
                level: 4,
            },
        });
    });

    it('accepts proficiency level 0', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/user-skills/42',
            payload: {
                level: 0,
            },
        });

        expect(response.statusCode).toBe(200);
    });

    it('accepts proficiency level 5', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/user-skills/42',
            payload: {
                level: 5,
            },
        });

        expect(response.statusCode).toBe(200);
    });

    it('rejects proficiency below 0', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/user-skills/42',
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
            url: '/api/v1/user-skills/42',
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
            url: '/api/v1/user-skills/42',
            payload: {
                level: 3.5,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('accepts deletion with a valid skill id', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/user-skills/42',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            message: 'Delete user skill',
            skillId: 42,
        });
    });

    it('rejects deletion with an invalid skill id', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/user-skills/nope',
        });

        expect(response.statusCode).toBe(400);
    });
});