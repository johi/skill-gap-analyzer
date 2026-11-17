import { canonicalSkillCategory, uniqueSkillCategories } from '@/services/skill-category';
import type { Skill, SkillRepository } from '@/repositories/skill-repository';
import {
    JobDataset,
    JobImportAnalysis,
} from '@/schemas/job-dataset';


export type AnalyzedSkill = JobImportAnalysis['jobs'][number]['skills'][number];
export type AnalyzedJob = JobImportAnalysis['jobs'][number];

export class JobImportService {
    constructor(
        private readonly skillRepository: SkillRepository
    ) {}

    async analyze(
        dataset: JobDataset
    ): Promise<JobImportAnalysis> {
        const catalogue = await this.skillRepository.findAll();
        const existingCategories = uniqueSkillCategories(catalogue.map(skill => skill.category));
        const skillsByName = new Map(catalogue.map(skill => [skill.name.toLowerCase(), skill]));
        const jobs: AnalyzedJob[] = [];

        for (const job of dataset.jobs) {
            const analyzedSkills =
                this.analyzeSkills(job.skills, existingCategories, skillsByName);

            jobs.push({
                job,
                skills: analyzedSkills,
            });
        }

        return {
            version: dataset.version,
            totalJobs: dataset.jobs.length,
            existingCategories,
            requiresReview: jobs.some(
                (job) =>
                    job.skills.some(
                        (skill) =>
                            skill.resolution ===
                            'review_required'
                    )
            ),
            jobs,
        };
    }

    private analyzeSkills(
        skills: JobDataset['jobs'][number]['skills'],
        knownCategories: string[],
        skillsByName: ReadonlyMap<string, Skill>
    ): AnalyzedSkill[] {
        const analyzed = new Map<string, AnalyzedSkill>();

        for (const skill of skills) {
            const existing = skillsByName.get(skill.name.toLowerCase());

            const canonicalName =
                existing?.name ?? skill.name;

            const canonicalKey =
                canonicalName.toLowerCase();

            const previous = analyzed.get(canonicalKey);

            if (!previous) {
                analyzed.set(canonicalKey, {
                    name: skill.name,
                    category: existing?.category ?? canonicalSkillCategory(skill.category, knownCategories),
                    requirement: skill.requirement,
                    resolution: existing
                        ? 'existing'
                        : 'new',
                    canonicalSkillId: existing?.id ?? null,
                    canonicalName,
                });

                continue;
            }

            if (
                previous.requirement ===
                skill.requirement
            ) {
                continue;
            }

            const conflictingRequirements =
                Array.from(
                    new Set<AnalyzedSkill['requirement']>([
                        previous.requirement,
                        skill.requirement,
                    ])
                );

            analyzed.set(canonicalKey, {
                ...previous,
                resolution: 'review_required',
                conflictingRequirements,
            });
        }

        return Array.from(analyzed.values());
    }
}