import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeJobAdvertisement } from '../../src/api/job-analysis';
import { ApiError } from '../../src/api/client';

const advertisement = 'Example Company seeks a Senior TypeScript Developer for our Copenhagen office. Full-time employment.';
const result = {
    dateFound: '2026-10-21',
    originalText: advertisement,
    requiresReview: false,
    proposal: {
        company: 'Example Company', title: 'Senior TypeScript Developer',
        location: 'Copenhagen', workModel: null, employmentType: 'full_time',
        seniority: 'senior', primaryRole: null, yearsRequired: null,
        educationRequirement: null, languageRequirements: [], salaryRate: null,
        skills: [{ name: 'TypeScript', category: 'language', requirement: 'must_have' }],
    },
};

afterEach(() => vi.unstubAllGlobals());

describe('Job advertisement analysis API', () => {
    it('submits raw advertisement and validates the returned proposal', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        expect(await analyzeJobAdvertisement(advertisement)).toEqual(result);
        expect(fetchMock).toHaveBeenCalledWith('/api/v1/job-analysis/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ advertisement }),
        });
    });

    it('rejects invalid structured responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ ...result, proposal: { company: 'Missing fields' } }), { status: 200 })
        ));
        await expect(analyzeJobAdvertisement(advertisement)).rejects.toThrow();
    });

    it('propagates provider errors', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
            new Response(JSON.stringify({
                error: 'ai_service_unavailable', message: 'AI analysis is currently unavailable',
            }), { status: 503 })
        ));
        await expect(analyzeJobAdvertisement(advertisement)).rejects.toBeInstanceOf(ApiError);
    });
});
