import type {
    MarketAnalysisService,
    SkillDemand,
} from '@/services/market-analysis-service';

import type {
    UserSkillRepository,
} from '@/repositories/user-skill-repository';

export interface SkillGap extends SkillDemand {
    proficiency: number | null;
    gap: number | null;
    status: 'assessed' | 'unassessed';
}

export interface SkillGapResult {
    totalJobsAnalyzed: number;
    skills: SkillGap[];
}

export class SkillGapAnalysisService {
    constructor(
        private readonly marketAnalysisService: MarketAnalysisService,
        private readonly userSkillRepository: UserSkillRepository
    ) {}

    async getSkillGaps(): Promise<SkillGapResult> {
        const [marketDemand, assessments] = await Promise.all([
            this.marketAnalysisService.getSkillDemand(),
            this.userSkillRepository.findAll(),
        ]);

        const proficiencyBySkillId = new Map(
            assessments.map((assessment) => [
                assessment.skillId,
                assessment.level,
            ])
        );

        return {
            totalJobsAnalyzed: marketDemand.totalJobsAnalyzed,
            skills: marketDemand.skills.map((skill) => {
                const proficiency =
                    proficiencyBySkillId.get(skill.skillId) ?? null;

                return {
                    ...skill,
                    proficiency,
                    gap: proficiency === null
                        ? null
                        : 5 - proficiency,
                    status: proficiency === null
                        ? 'unassessed' as const
                        : 'assessed' as const,
                };
            }),
        };
    }
}
