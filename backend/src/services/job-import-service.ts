import { SkillRepository } from '@/repositories/skill-repository';
import {
    JobDataset,
    JobImportAnalysis,
} from '@/schemas/job-dataset';


type SkillRequirement =
    'must_have' |
    'nice_to_have';

export interface AnalyzedSkill {
    name: string;
    category: string;
    requirement: SkillRequirement;
    resolution:
        'existing' |
        'new' |
        'review_required';
    canonicalSkillId: number | null;
    canonicalName: string;
    conflictingRequirements?: SkillRequirement[];
}

export interface AnalyzedJob {
    job: JobDataset['jobs'][number];
    skills: AnalyzedSkill[];
}

export class JobImportService {
    constructor(
        private readonly skillRepository: SkillRepository
    ) {}

    async analyze(
        dataset: JobDataset
    ): Promise<JobImportAnalysis> {
        const jobs: AnalyzedJob[] = [];

        for (const job of dataset.jobs) {
            const analyzedSkills =
                await this.analyzeSkills(job.skills);

            jobs.push({
                job,
                skills: analyzedSkills,
            });
        }

        return {
            version: dataset.version,
            totalJobs: dataset.jobs.length,
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

    private async analyzeSkills(
        skills: JobDataset['jobs'][number]['skills']
    ): Promise<AnalyzedSkill[]> {
        const analyzed = new Map<string, AnalyzedSkill>();

        for (const skill of skills) {
            const existing =
                await this.skillRepository.findByName(
                    skill.name
                );

            const canonicalName =
                existing?.name ?? skill.name;

            const canonicalKey =
                canonicalName.trim().toLowerCase();

            const previous = analyzed.get(canonicalKey);

            if (!previous) {
                analyzed.set(canonicalKey, {
                    name: skill.name,
                    category: skill.category,
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
                    new Set<SkillRequirement>([
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