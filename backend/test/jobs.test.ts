import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { buildApp } from '../src/app';

describe('Jobs API', () => {
    let app: ReturnType<typeof buildApp>;

    beforeEach(() => {
        app = buildApp();
    });

    afterEach(async () => {
        await app.close();
    });

    it('accepts a valid job', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                interest: 80,
                skills: [
                    {
                        name: 'TypeScript',
                        category: 'language',
                        requirement: 'must_have',
                    },
                    {
                        name: 'PostgreSQL',
                        category: 'database',
                        requirement: 'nice_to_have',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(201);
    });

    it('rejects interest above 100', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                interest: 101,
                skills: [],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: 'validation_error',
        });
    });

    it.each([
        ['workModel', 'sometimes_remote'],
        ['employmentType', 'freelance-ish'],
        ['seniority', 'very_senior'],
        ['danishRequired', 'maybe'],
        ['applyStatus', 'considering'],
    ])(
        'rejects invalid %s',
        async (field, value) => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/jobs',
                payload: {
                    dateFound: '2026-09-20',
                    company: 'Example Company',
                    title: 'Senior Backend Developer',
                    skills: [],
                    [field]: value,
                },
            });

            expect(response.statusCode).toBe(400);

            expect(response.json()).toMatchObject({
                error: 'validation_error',
            });
        }
    );

    it('rejects an invalid skill requirement', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                skills: [
                    {
                        name: 'TypeScript',
                        category: 'language',
                        requirement: 'sort_of_important',
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('rejects an invalid job id', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs/nope',
        });

        expect(response.statusCode).toBe(400);
    });

    it('returns jobs using the canonical API contract', async () => {
        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/jobs',
            payload: {
                dateFound: '2026-09-20',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                workModel: 'hybrid',
                employmentType: 'full_time',
                seniority: 'senior',
                danishRequired: 'no',
                applyStatus: 'not_applied',
                skills: [],
            },
        });

        expect(createResponse.statusCode).toBe(201);

        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/jobs',
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    workModel: 'hybrid',
                    employmentType: 'full_time',
                    seniority: 'senior',
                    danishRequired: 'no',
                    applyStatus: 'not_applied',
                }),
            ])
        );
    });
});