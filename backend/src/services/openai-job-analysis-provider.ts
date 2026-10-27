import {
    JobAnalysisInvalidResponseError,
    JobAnalysisUnavailableError,
} from '@/errors/job-analysis-errors';
import {
    jobExtractionJsonSchema,
    skillCategorizationJsonSchema,
    type JobAnalysisProvider,
    type AnalysisValidationIssue,
} from '@/services/job-analysis-contract';
import {
    jobAnalysisInstructions,
    jobAnalysisCorrectionInstructions,
    skillCategorizationInstructions,
} from '@/services/job-analysis-instructions';
import {
    contentClassificationInstructions,
    contentClassificationJsonSchema,
} from '@/services/job-advertisement-dom-classification';

interface OpenAiResponse {
    status?: string;
    incomplete_details?: { reason?: string } | null;
    usage?: { input_tokens?: number; output_tokens?: number };
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

    correctAnalysis(advertisement: string, previous: unknown, issues: AnalysisValidationIssue[]): Promise<unknown> {
        return this.request(
            jobAnalysisCorrectionInstructions,
            JSON.stringify({ advertisement, previous, validationIssues: issues }),
            jobExtractionJsonSchema,
            'job_advertisement_correction'
        );
    }

    categorize(skills: string[], existingCategories: string[], advertisement: string): Promise<unknown> {
        return this.request(
            skillCategorizationInstructions,
            JSON.stringify({ skills, existingCategories, advertisement }),
            skillCategorizationJsonSchema,
            'skill_categorization'
        );
    }

    /** Experimental: not used by the existing URL-fetch or analysis services. */
    classifyContent(tree: string): Promise<unknown> {
        return this.request(
            contentClassificationInstructions,
            tree,
            contentClassificationJsonSchema,
            'html_content_classification'
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

        if (process.env.DEBUG_HTML_CLASSIFICATION === '1') {
            console.warn('[OPENAI ANALYSIS DIAGNOSTIC]', JSON.stringify({
                operation: name,
                status: payload?.status ?? 'missing',
                incompleteReason: payload?.incomplete_details?.reason ?? null,
                inputTokens: payload?.usage?.input_tokens ?? null,
                outputTokens: payload?.usage?.output_tokens ?? null,
                outputTypes: Array.isArray(payload?.output)
                    ? payload.output.map(item => item.type ?? 'missing')
                    : null,
            }));
        }

        if (!payload || typeof payload !== 'object' ||
            payload.status !== 'completed' || !Array.isArray(payload.output)) {
            throw new JobAnalysisInvalidResponseError();
        }

        const text = payload.output
            .filter(item => item && item.type === 'message' && Array.isArray(item.content))
            .flatMap(item => item.content ?? [])
            .find(item => item && item.type === 'output_text' && typeof item.text === 'string')?.text;

        if (!text) {
            if (process.env.DEBUG_HTML_CLASSIFICATION === '1') {
                console.warn('[OPENAI ANALYSIS DIAGNOSTIC] no output_text', name);
            }
            throw new JobAnalysisInvalidResponseError();
        }
        try {
            return JSON.parse(text) as unknown;
        } catch {
            if (process.env.DEBUG_HTML_CLASSIFICATION === '1') {
                console.warn('[OPENAI ANALYSIS DIAGNOSTIC] invalid output JSON', name);
            }
            throw new JobAnalysisInvalidResponseError();
        }
    }
}
