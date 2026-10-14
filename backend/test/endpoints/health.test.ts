import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '@/app';
import { cleanDatabase } from '../helpers/database';

describe('Health API', () => {
    const app = buildApp();

    beforeEach(async () => {
        await app.ready();
        await cleanDatabase();
    });

    afterEach(async () => {
        await cleanDatabase();
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