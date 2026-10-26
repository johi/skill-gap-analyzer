import { z } from 'zod';
import {
    jobProposalSchema,
    jobAdvertisementAnalysisSchema,
    type JobAdvertisementAnalysis,
} from '@/schemas/job-analysis';
import { JobAnalysisInvalidResponseError } from '@/errors/job-analysis-errors';
import type { JobAnalysisProvider } from '@/services/job-analysis-contract';
import type { SkillRepository } from '@/repositories/skill-repository';
import { canonicalSkillCategory, categoryKey, normalizeSkillCategory } from '@/services/skill-category';

// Preserve source-line boundaries when validating recruitment contact roles.
function sourceLines(advertisement: string): string[] {
    return advertisement.match(/[^\n]*\n|[^\n]+$/g) ?? [];
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
        advertisement: string, sourceUrl: string | null = null, extractedTitle: string | null = null
    ): Promise<JobAdvertisementAnalysis> {
        // Give the AI explicit source metadata; never add it to the saved advertisement.
        const aiInput = extractedTitle ? `Job title: ${extractedTitle}\n\n${advertisement}` : advertisement;
        const providerResult = await this.provider.analyze(aiInput);
        const extracted = jobProposalSchema.safeParse(providerResult);
        if (!extracted.success) throw new JobAnalysisInvalidResponseError();

        const proposal = extracted.data;
        // JSON-LD title is source metadata, not an AI inference.
        if (extractedTitle && extractedTitle.length <= 255) proposal.title = extractedTitle;
        proposal.applicationDeadline ??= null;
        proposal.contacts ??= [];
        // A role is accepted only when the same source line explicitly associates
        // that role with the named contact. Otherwise leave it for human review.
        const lines = sourceLines(advertisement).map(line => line.toLocaleLowerCase());
        proposal.contacts = proposal.contacts.map(contact => {
            if (!contact.role || !contact.name) return { ...contact, role: null };
            const name = contact.name.toLocaleLowerCase();
            const role = contact.role.toLocaleLowerCase();
            return lines.some(line => line.includes(name) && line.includes(role))
                ? contact : { ...contact, role: null };
        });
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
            if (!result.success || result.data.skills.length !== unmatched.length) {
                throw new JobAnalysisInvalidResponseError();
            }
            proposed = new Map();
            for (const item of result.data.skills) {
                const key = item.name.trim().toLocaleLowerCase('en-US');
                if (proposed.has(key) || !unmatched.some(skill => skill.name.trim().toLocaleLowerCase('en-US') === key)) {
                    throw new JobAnalysisInvalidResponseError();
                }
                proposed.set(key, item.category);
            }
            if (proposed.size !== unmatched.length) throw new JobAnalysisInvalidResponseError();
        }

        proposal.skills = proposal.skills.map(skill => {
            const key = skill.name.trim().toLocaleLowerCase('en-US');
            const existing = byName.get(key);
            if (existing) return { ...skill, name: existing.name, category: normalizeSkillCategory(existing.category) || null };
            const category = proposed.get(key) ?? skill.category;
            const normalized = category ? canonicalSkillCategory(category, categories) : '';
            return { ...skill, category: normalized || null };
        });

        return jobAdvertisementAnalysisSchema.parse({
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
    }
}
