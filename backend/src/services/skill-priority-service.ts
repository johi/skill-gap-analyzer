
import type {
    SkillGap,
    SkillGapAnalysisService,
} from '@/services/skill-gap-analysis-service';

const DEMAND_EXPONENT = 0.7;
const GAP_EXPONENT = 0.3;
const TARGET_PROFICIENCY = 5;

export interface SkillPriority extends SkillGap {
    demandWeight: number;
    priorityScore: number | null;
}

export interface SkillPriorityResult {
    totalJobsAnalyzed: number;
    skills: SkillPriority[];
    missingInformation: string[];
}

export class SkillPriorityService {
    constructor(
        private readonly skillGapAnalysisService: SkillGapAnalysisService
    ) {}

    async getSkillPriorities(): Promise<SkillPriorityResult> {
        const analysis =
            await this.skillGapAnalysisService.getSkillGaps();

        const totalJobs = analysis.totalJobsAnalyzed;

        const missingInformation: string[] = [];

        if (totalJobs === 0 || analysis.skills.length === 0) {
            missingInformation.push('market_demand');
        }

        const skills = analysis.skills.map((skill): SkillPriority => {
            const demandWeight = totalJobs === 0
                ? 0
                : (
                2 * skill.mustHaveCount +
                skill.niceToHaveCount
            ) / (2 * totalJobs);

            if (skill.gap === null) {
                return {
                    ...skill,
                    demandWeight,
                    priorityScore: null,
                };
            }

            const normalizedGap =
                skill.gap / TARGET_PROFICIENCY;

            const priorityScore =
                100 *
                Math.pow(demandWeight, DEMAND_EXPONENT) *
                Math.pow(normalizedGap, GAP_EXPONENT);

            return {
                ...skill,
                demandWeight,
                priorityScore:
                    Math.round(priorityScore * 10) / 10,
            };
        });

        if (skills.some((skill) => skill.status === 'unassessed')) {
            missingInformation.push('skill_assessments');
        }

        skills.sort((a, b) => {
            if (a.priorityScore === null) return 1;
            if (b.priorityScore === null) return -1;

            return (
                b.priorityScore - a.priorityScore ||
                a.name.localeCompare(b.name)
            );
        });

        return {
            totalJobsAnalyzed: totalJobs,
            skills,
            missingInformation,
        };
    }
}
