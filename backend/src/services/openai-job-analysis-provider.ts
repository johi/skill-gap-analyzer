import {
    JobAnalysisInvalidResponseError,
    JobAnalysisUnavailableError,
} from '@/errors/job-analysis-errors';
import { jobExtractionJsonSchema, type JobAnalysisProvider } from '@/services/job-analysis-contract';
import { jobAnalysisInstructions } from '@/services/job-analysis-instructions';

interface OpenAiResponse {
    status?: string;
    output?: Array<{
        type?: string;
        content?: Array<{
            type?: string;
            text?: string;
        }>;
    }>;
}

export class OpenAiJobAnalysisProvider implements JobAnalysisProvider {
    constructor(
        private readonly apiKey = process.env.OPENAI_API_KEY,
        private readonly model = process.env.OPENAI_MODEL || 'gpt-4o-mini',
        private readonly fetchImpl: typeof fetch = fetch
    ) {}

    async analyze(advertisement: string): Promise<unknown> {
        if (!this.apiKey) {
            throw new JobAnalysisUnavailableError(
                'OpenAI API key is not configured on the backend'
            );
        }

        let response: Response;
        try {
            response = await this.fetchImpl('https://api.openai.com/v1/responses', {
                method: 'POST',
                signal: AbortSignal.timeout(30_000),
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    store: false,
                    instructions: jobAnalysisInstructions,
                    input: advertisement,
                    max_output_tokens: 4_000,
                    text: {
                        format: {
                            type: 'json_schema',
                            name: 'job_advertisement_analysis',
                            strict: true,
                            schema: jobExtractionJsonSchema,
                        },
                    },
                }),
            });
        } catch {
            throw new JobAnalysisUnavailableError();
        }

        if (!response.ok) {
            // Do not expose provider error bodies or request data to the client.
            throw new JobAnalysisUnavailableError();
        }

        let payload: OpenAiResponse;
        try {
            payload = await response.json() as OpenAiResponse;
        } catch {
            throw new JobAnalysisInvalidResponseError();
        }

        if (
            !payload || typeof payload !== 'object' ||
            payload.status !== 'completed' || !Array.isArray(payload.output)
        ) {
            throw new JobAnalysisInvalidResponseError();
        }

        const text = payload.output
            .filter(item => item && item.type === 'message' && Array.isArray(item.content))
            .flatMap(item => item.content ?? [])
            .find(item => item && item.type === 'output_text' && typeof item.text === 'string')?.text;

        if (!text) {
            throw new JobAnalysisInvalidResponseError();
        }

        try {
            return JSON.parse(text) as unknown;
        } catch {
            throw new JobAnalysisInvalidResponseError();
        }
    }
}
