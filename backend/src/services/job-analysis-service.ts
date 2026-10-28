import { z } from 'zod';
import {
    jobAdvertisementAnalysisSchema,
    jobProposalSchema,
    type JobAdvertisementAnalysis,
} from '@/schemas/job-analysis';
import { JobAnalysisInvalidResponseError } from '@/errors/job-analysis-errors';
import type { JobAnalysisProvider, AnalysisValidationIssue } from '@/services/job-analysis-contract';
import type { SkillRepository } from '@/repositories/skill-repository';
import { canonicalSkillCategory, categoryKey, normalizeSkillCategory } from '@/services/skill-category';

// Disabled by default. Logs validation structure only, never returned field values.
function logAnalysisValidation(stage: string, details: object): void {
    // Keep diagnostics available during normal operation without flooding Vitest output.
    if (process.env.DEBUG_HTML_CLASSIFICATION !== '1' || process.env.VITEST === 'true') return;
    console.error('[JOB ANALYSIS VALIDATION]', JSON.stringify({ stage, ...details }));
}

function logSchemaIssues(stage: string, error: z.ZodError): void {
    logAnalysisValidation(stage, {
        issues: error.issues.map(issue => ({
            path: issue.path.map(String).join('.'),
            code: issue.code,
        })),
    });
}

/** Resolve yearless dates without trusting a year absent from the source. */
function resolveYearlessDeadline(extraction: unknown, source: string): unknown {
    if (!extraction || typeof extraction !== 'object' || !('applicationDeadline' in extraction)) return extraction;
    let value = extraction.applicationDeadline;
    if (typeof value !== 'string') return extraction;

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        if (source.includes(value.slice(0, 4))) return extraction;
        value = value.slice(5);
    }
    if (!/^\d{2}-\d{2}$/.test(value)) return extraction;

    const today = new Date().toISOString().slice(0, 10);
    const year = Number(today.slice(0, 4)) + (value < today.slice(5) ? 1 : 0);
    return { ...extraction, applicationDeadline: `${year}-${value}` };
}

const categorizationSchema = z.object({
    skills: z.array(z.object({
        name: z.string().min(1),
        category: z.string().min(1),
    })),
});

export class JobAnalysisService {
    constructor(
        private readonly provider: JobAnalysisProvider,
        private readonly skillCatalogue?: Pick<SkillRepository, 'findAll'>
    ) {}

    async analyze(
        advertisement: string,
        sourceUrl: string | null = null,
        extractedTitle: string | null = null,
        metadataContext: string | null = null
    ): Promise<JobAdvertisementAnalysis> {
        // Supplementary page facts inform extraction but must never enter originalText.
        const baseInput = extractedTitle ? `Job title: ${extractedTitle}\n\n${advertisement}` : advertisement;
        const analysisInput = metadataContext?.trim()
            ? `${baseInput}\n\nSUPPLEMENTARY JOB METADATA (facts only, not advertisement text):\n${metadataContext}`
            : baseInput;

        const rawExtraction = await this.provider.analyze(analysisInput);
        let extracted = jobProposalSchema.safeParse(resolveYearlessDeadline(rawExtraction, analysisInput));
        if (!extracted.success) {
            logSchemaIssues('extraction_schema', extracted.error);
            if (!this.provider.correctAnalysis) throw new JobAnalysisInvalidResponseError();
            const issues: AnalysisValidationIssue[] = extracted.error.issues.map(issue => ({
                path: issue.path.map(String).join('.'),
                code: issue.code,
            }));
            logAnalysisValidation('extraction_correction', { attempt: 1, issueCount: issues.length });
            const corrected = await this.provider.correctAnalysis(analysisInput, rawExtraction, issues);
            extracted = jobProposalSchema.safeParse(resolveYearlessDeadline(corrected, analysisInput));
            if (!extracted.success) {
                logSchemaIssues('extraction_correction_failed', extracted.error);
                throw new JobAnalysisInvalidResponseError();
            }
            logAnalysisValidation('extraction_correction_succeeded', { attempt: 1 });
        }

        const proposal = extracted.data;
        // A trusted source title takes precedence over an AI-inferred title.
        if (extractedTitle && extractedTitle.length <= 255) proposal.title = extractedTitle;
        const existingSkills = await this.skillCatalogue?.findAll() ?? [];
        const byName = new Map(existingSkills.map(skill => [skill.name.trim().toLocaleLowerCase('en-US'), skill]));
        const categories = Array.from(new Map(existingSkills
            .filter(skill => normalizeSkillCategory(skill.category))
            .map(skill => [categoryKey(skill.category), normalizeSkillCategory(skill.category)] as const)).values());
        const unmatched = proposal.skills.filter(skill => !byName.has(skill.name.trim().toLocaleLowerCase('en-US')));

        // Extraction and categorization are separate AI stages. Catalogue matches
        // are resolved deterministically and are never recategorized by the model.
        let proposed = new Map<string, string>();
        if (this.skillCatalogue && unmatched.length > 0) {
            const result = categorizationSchema.safeParse(await this.provider.categorize(
                unmatched.map(skill => skill.name), categories, advertisement
            ));
            if (!result.success) {
                logSchemaIssues('categorization_schema', result.error);
                throw new JobAnalysisInvalidResponseError();
            }
            if (result.data.skills.length !== unmatched.length) {
                logAnalysisValidation('categorization_count', {
                    expected: unmatched.length,
                    received: result.data.skills.length,
                });
                throw new JobAnalysisInvalidResponseError();
            }
            proposed = new Map();
            for (const item of result.data.skills) {
                const key = item.name.trim().toLocaleLowerCase('en-US');
                if (proposed.has(key) || !unmatched.some(skill => skill.name.trim().toLocaleLowerCase('en-US') === key)) {
                    logAnalysisValidation('categorization_skill_mapping', { reason: 'duplicate_or_unexpected_skill' });
                    throw new JobAnalysisInvalidResponseError();
                }
                proposed.set(key, item.category);
            }
            if (proposed.size !== unmatched.length) {
                logAnalysisValidation('categorization_skill_mapping', { reason: 'missing_skill' });
                throw new JobAnalysisInvalidResponseError();
            }
        }

        proposal.skills = proposal.skills.map(skill => {
            const key = skill.name.trim().toLocaleLowerCase('en-US');
            const existing = byName.get(key);
            if (existing) return { ...skill, name: existing.name, category: normalizeSkillCategory(existing.category) || null };
            const category = proposed.get(key) ?? skill.category;
            const normalized = category ? canonicalSkillCategory(category, categories) : '';
            return { ...skill, category: normalized || null };
        });

        const finalResult = jobAdvertisementAnalysisSchema.safeParse({
            dateFound: new Date().toISOString().slice(0, 10),
            originalText: advertisement,
            sourceUrl,
            proposal,
            requiresReview:
                proposal.company === null || proposal.title === null ||
                proposal.skills.some(skill =>
                    skill.category === null || skill.requirement === null ||
                    (this.skillCatalogue !== undefined &&
                        !categories.some(category => categoryKey(category) === categoryKey(skill.category ?? '')))
                ),
        });
        if (!finalResult.success) {
            logSchemaIssues('final_analysis_schema', finalResult.error);
            throw new JobAnalysisInvalidResponseError();
        }
        return finalResult.data;
    }
}
