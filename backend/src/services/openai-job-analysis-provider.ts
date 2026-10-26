import {
    JobAnalysisInvalidResponseError,
    JobAnalysisUnavailableError,
} from '@/errors/job-analysis-errors';
import {
    jobExtractionJsonSchema,
    skillCategorizationJsonSchema,
    type JobAnalysisProvider,
} from '@/services/job-analysis-contract';
import {
    jobAnalysisInstructions,
    skillCategorizationInstructions,
} from '@/services/job-analysis-instructions';

interface OpenAiResponse {
    status?: string;
    output?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
    }>;
}

export class OpenAiJobAnalysisProvider implements JobAnalysisProvider {
    constructor(
        private readonly apiKey = process.env.OPENAI_API_KEY,
        private readonly model = process.env.OPENAI_MODEL || 'gpt-4o-mini',
        private readonly fetchImpl: typeof fetch = fetch
    ) {}

    analyze(advertisement: string): Promise<unknown> {
        return this.request(jobAnalysisInstructions, advertisement, jobExtractionJsonSchema, 'job_advertisement_analysis');
    }

    categorize(skills: string[], existingCategories: string[], advertisement: string): Promise<unknown> {
        return this.request(
            skillCategorizationInstructions,
            JSON.stringify({ skills, existingCategories, advertisement }),
            skillCategorizationJsonSchema,
            'skill_categorization'
        );
    }

    private async request(
        instructions: string,
        input: string,
        schema: object,
        name: string
    ): Promise<unknown> {
        if (!this.apiKey) {
            throw new JobAnalysisUnavailableError('OpenAI API key is not configured on the backend');
        }

        let response: Response;
        try {
            response = await this.fetchImpl('https://api.openai.com/v1/responses', {
                method: 'POST',
                signal: AbortSignal.timeout(90_000),
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    store: false,
                    instructions,
                    input,
                    max_output_tokens: 4_000,
                    text: { format: { type: 'json_schema', name, strict: true, schema } },
                }),
            });
        } catch {
            throw new JobAnalysisUnavailableError();
        }

        if (!response.ok) {
            throw new JobAnalysisUnavailableError();
        }

        let payload: OpenAiResponse;
        try {
            payload = await response.json() as OpenAiResponse;
        } catch {
            throw new JobAnalysisInvalidResponseError();
        }

        if (!payload || typeof payload !== 'object' ||
            payload.status !== 'completed' || !Array.isArray(payload.output)) {
            throw new JobAnalysisInvalidResponseError();
        }

        const text = payload.output
            .filter(item => item && item.type === 'message' && Array.isArray(item.content))
            .flatMap(item => item.content ?? [])
            .find(item => item && item.type === 'output_text' && typeof item.text === 'string')?.text;

        if (!text) throw new JobAnalysisInvalidResponseError();
        try {
            return JSON.parse(text) as unknown;
        } catch {
            throw new JobAnalysisInvalidResponseError();
        }
    }
}
