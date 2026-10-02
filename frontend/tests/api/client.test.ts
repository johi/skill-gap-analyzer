import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { z } from 'zod';

import {
    ApiError,
    apiRequest,
} from '../../src/api/client';

describe('apiRequest', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns validated JSON from a successful response', async () => {
        const responseBody = {
            id: 1,
            name: 'TypeScript',
        };

        const schema = z.object({
            id: z.number(),
            name: z.string(),
        });

        vi.spyOn(globalThis, 'fetch')
            .mockResolvedValue(
                new Response(
                    JSON.stringify(responseBody),
                    {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

        const result = await apiRequest(
            '/api/v1/skills/1',
            schema
        );

        expect(result).toEqual(responseBody);

        expect(fetch).toHaveBeenCalledWith(
            '/api/v1/skills/1',
            undefined
        );
    });

    it('passes request options to fetch', async () => {
        const schema = z.object({
            id: z.number(),
        });

        vi.spyOn(globalThis, 'fetch')
            .mockResolvedValue(
                new Response(
                    JSON.stringify({
                        id: 1,
                    }),
                    {
                        status: 201,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

        const options: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'TypeScript',
                category: 'language',
            }),
        };

        await apiRequest(
            '/api/v1/skills',
            schema,
            options
        );

        expect(fetch).toHaveBeenCalledWith(
            '/api/v1/skills',
            options
        );
    });

    it('throws a structured API error', async () => {
        vi.spyOn(globalThis, 'fetch')
            .mockResolvedValue(
                new Response(
                    JSON.stringify({
                        error: 'not_found',
                        message: 'Skill 99 not found',
                    }),
                    {
                        status: 404,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

        try {
            await apiRequest(
                '/api/v1/skills/99',
                null
            );

            expect.fail('Expected apiRequest to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError);

            const apiError = error as ApiError;

            expect(apiError.status).toBe(404);
            expect(apiError.error).toBe('not_found');
            expect(apiError.message).toBe(
                'Skill 99 not found'
            );
            expect(apiError.issues).toEqual([]);
        }
    });

    it('preserves validation issues', async () => {
        const issues = [
            {
                path: 'company',
                message: 'Too small',
                code: 'too_small',
            },
        ];

        vi.spyOn(globalThis, 'fetch')
            .mockResolvedValue(
                new Response(
                    JSON.stringify({
                        error: 'validation_error',
                        message: 'Request validation failed',
                        issues,
                    }),
                    {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

        try {
            await apiRequest(
                '/api/v1/jobs',
                null
            );

            expect.fail('Expected apiRequest to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError);

            const apiError = error as ApiError;

            expect(apiError.status).toBe(400);
            expect(apiError.error).toBe(
                'validation_error'
            );
            expect(apiError.issues).toEqual(issues);
        }
    });

    it('handles a 204 response without parsing JSON', async () => {
        vi.spyOn(globalThis, 'fetch')
            .mockResolvedValue(
                new Response(null, {
                    status: 204,
                })
            );

        const result = await apiRequest<void>(
            '/api/v1/jobs/1',
            null,
            {
                method: 'DELETE',
            }
        );

        expect(result).toBeUndefined();
    });

    it('rejects an invalid successful response', async () => {
        const schema = z.object({
            id: z.number(),
            name: z.string(),
        });

        vi.spyOn(globalThis, 'fetch')
            .mockResolvedValue(
                new Response(
                    JSON.stringify({
                        id: 'not-a-number',
                        name: 'TypeScript',
                    }),
                    {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

        await expect(
            apiRequest(
                '/api/v1/skills/1',
                schema
            )
        ).rejects.toThrow();
    });
});