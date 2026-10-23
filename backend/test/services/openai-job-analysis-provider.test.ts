import { describe, expect, it, vi } from 'vitest';
import { OpenAiJobAnalysisProvider } from '@/services/openai-job-analysis-provider';
import { jobExtractionJsonSchema } from '@/services/job-analysis-contract';
import { jobAnalysisInstructions } from '@/services/job-analysis-instructions';
import {
    JobAnalysisInvalidResponseError,
    JobAnalysisUnavailableError,
} from '@/errors/job-analysis-errors';

const advertisement = 'A sufficiently long job advertisement about backend development, with TypeScript and PostgreSQL.';

function response(text: string, status = 'completed'): Response {
    return new Response(JSON.stringify({
        status,
        output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('OpenAiJobAnalysisProvider', () => {
    it('uses structured Responses API output, keeps API key on backend, and disables storage', async () => {
        const fetchMock = vi.fn().mockResolvedValue(response('{"company":"Example"}'));
        const provider = new OpenAiJobAnalysisProvider('test-secret', 'gpt-4o-mini', fetchMock as unknown as typeof fetch);
        expect(await provider.analyze(advertisement)).toEqual({ company: 'Example' });
        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('https://api.openai.com/v1/responses');
        expect(init.headers.Authorization).toBe('Bearer test-secret');
        const body = JSON.parse(init.body);
        expect(body).toMatchObject({
            model: 'gpt-4o-mini',
            store: false,
            input: advertisement,
            text: { format: { type: 'json_schema', strict: true } },
        });
        expect(body.text.format.schema).toEqual(jobExtractionJsonSchema);
        expect(body.instructions).toBe(jobAnalysisInstructions);
    });

    it('refuses to call the provider without an API key', async () => {
        const fetchMock = vi.fn();
        const provider = new OpenAiJobAnalysisProvider('', 'gpt-4o-mini', fetchMock as unknown as typeof fetch);
        await expect(provider.analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisUnavailableError);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reports provider HTTP failures as unavailable', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
        const provider = new OpenAiJobAnalysisProvider('test-secret', 'gpt-4o-mini', fetchMock as unknown as typeof fetch);
        await expect(provider.analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisUnavailableError);
    });

    it('reports network failures as unavailable', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
        const provider = new OpenAiJobAnalysisProvider('test-secret', 'gpt-4o-mini', fetchMock as unknown as typeof fetch);
        await expect(provider.analyze(advertisement))
            .rejects.toBeInstanceOf(JobAnalysisUnavailableError);
    });

    it('rejects malformed JSON, refusals, and incomplete responses', async () => {
        for (const result of [
            response('{invalid'),
            response('{}', 'incomplete'),
            new Response(JSON.stringify({ status: 'completed', output: [] }), { status: 200 }),
            new Response(JSON.stringify({ status: 'completed', output: {} }), { status: 200 }),
            new Response('null', { status: 200 }),
        ]) {
            const fetchMock = vi.fn().mockResolvedValue(result);
            const provider = new OpenAiJobAnalysisProvider('test-secret', 'gpt-4o-mini', fetchMock as unknown as typeof fetch);
            await expect(provider.analyze(advertisement))
                .rejects.toBeInstanceOf(JobAnalysisInvalidResponseError);
        }
    });
});

describe('OpenAI stage-two categorization', () => {
    it('uses the provider-independent category schema and sends only unmatched skills', async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(JSON.stringify({
            skills: [{ name: 'RabbitMQ', category: 'Messaging Systems' }],
        })));
        const provider = new OpenAiJobAnalysisProvider('test-secret', 'gpt-4o-mini', fetchMock as unknown as typeof fetch);
        expect(await provider.categorize(['RabbitMQ'], ['Databases'], advertisement)).toEqual({
            skills: [{ name: 'RabbitMQ', category: 'Messaging Systems' }],
        });
        const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
        expect(body.text.format.name).toBe('skill_categorization');
        expect(JSON.parse(body.input)).toEqual({ skills: ['RabbitMQ'], existingCategories: ['Databases'], advertisement });
    });
});
