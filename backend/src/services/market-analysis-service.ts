
import type {
    MarketAnalysisRepository,
} from '@/repositories/market-analysis-repository';

export interface SkillDemand {
    skillId: number;
    name: string;
    category: string;
    jobCount: number;
    mustHaveCount: number;
    niceToHaveCount: number;
    demandPercentage: number;
}

export interface SkillDemandResult {
    totalJobsAnalyzed: number;
    skills: SkillDemand[];
}

export class MarketAnalysisService {
    constructor(
        private readonly repository: MarketAnalysisRepository
    ) {}

    async getSkillDemand(): Promise<SkillDemandResult> {
        const data = await this.repository.getSkillDemand();

        return {
            totalJobsAnalyzed: data.totalJobsAnalyzed,
            skills: data.skills.map((skill) => ({
                ...skill,
                demandPercentage:
                    data.totalJobsAnalyzed === 0
                        ? 0
                        : Math.round(
                        (skill.jobCount / data.totalJobsAnalyzed) * 1000
                    ) / 10,
            })),
        };
    }
}
