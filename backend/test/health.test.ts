import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '../src/app';

describe('Health API', () => {
    let app: ReturnType<typeof buildApp>;

    beforeEach(() => {
        app = buildApp();
    });

    afterEach(async () => {
        await app.close();
    });

    it('reports that the service and database are healthy', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/health',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            status: 'ok',
            database: 'connected',
        });
    });
});