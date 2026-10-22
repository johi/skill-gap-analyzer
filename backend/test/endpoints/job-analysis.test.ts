import Fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerErrorHandler } from '@/errors/error-handler';
import { createJobAnalysisRoutes } from '@/routes/job-analysis';
import { JobAnalysisService } from '@/services/job-analysis-service';
import {
    JobAnalysisInvalidResponseError,
    JobAnalysisUnavailableError,
} from '@/errors/job-analysis-errors';

const advertisement = 'Example Company seeks a Senior TypeScript Developer for our Copenhagen office. Full-time employment.';

function proposal() {
    return {
        company: 'Example Company', title: 'Senior TypeScript Developer',
        location: 'Copenhagen', workModel: null, employmentType: 'full_time',
        seniority: 'senior', primaryRole: null, yearsRequired: null,
        educationRequirement: null, languageRequirements: [], salaryRate: null,
        skills: [{ name: 'TypeScript', category: 'language', requirement: 'must_have' }],
    };
}

describe('POST /api/v1/job-analysis/analyze (UC-09–11)', () => {
    const provider = { analyze: vi.fn() };
    const app = Fastify();

    beforeAll(async () => {
        registerErrorHandler(app);
        await app.register(createJobAnalysisRoutes(new JobAnalysisService(provider)), {
            prefix: '/api/v1/job-analysis',
        });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        provider.analyze.mockReset();
        provider.analyze.mockResolvedValue(proposal());
    });

    it('returns extracted metadata without writing to a database', async () => {
        const result = await app.inject({
            method: 'POST', url: '/api/v1/job-analysis/analyze',
            payload: { advertisement },
        });
        expect(result.statusCode).toBe(200);
        expect(result.json()).toMatchObject({
            originalText: advertisement,
            proposal: { company: 'Example Company' },
        });
        expect(provider.analyze).toHaveBeenCalledExactlyOnceWith(advertisement);
    });

    it('rejects invalid input', async () => {
        const result = await app.inject({
            method: 'POST', url: '/api/v1/job-analysis/analyze',
            payload: { advertisement: '  ' },
        });
        expect(result.statusCode).toBe(400);
        expect(result.json().error).toBe('validation_error');
        expect(provider.analyze).not.toHaveBeenCalled();
    });

    it('reports provider unavailability', async () => {
        provider.analyze.mockRejectedValue(new JobAnalysisUnavailableError());
        const result = await app.inject({
            method: 'POST', url: '/api/v1/job-analysis/analyze',
            payload: { advertisement },
        });
        expect(result.statusCode).toBe(503);
        expect(result.json().error).toBe('ai_service_unavailable');
    });

    it('reports malformed model output', async () => {
        provider.analyze.mockRejectedValue(new JobAnalysisInvalidResponseError());
        const result = await app.inject({
            method: 'POST', url: '/api/v1/job-analysis/analyze',
            payload: { advertisement },
        });
        expect(result.statusCode).toBe(502);
        expect(result.json().error).toBe('ai_invalid_response');
    });

    it('rejects valid JSON with invalid structured fields', async () => {
        provider.analyze.mockResolvedValue({ ...proposal(), skills: [{ name: '', category: null, requirement: null }] });
        const result = await app.inject({
            method: 'POST', url: '/api/v1/job-analysis/analyze',
            payload: { advertisement },
        });
        expect(result.statusCode).toBe(502);
        expect(result.json().error).toBe('ai_invalid_response');
    });

});
