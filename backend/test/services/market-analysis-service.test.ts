
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { MarketAnalysisService } from '@/services/market-analysis-service';
import type { MarketAnalysisRepository } from '@/repositories/market-analysis-repository';

describe('MarketAnalysisService', () => {
    const repository = {
        getSkillDemand: vi.fn(),
    };

    let service: MarketAnalysisService;

    beforeEach(() => {
        vi.resetAllMocks();

        service = new MarketAnalysisService(
            repository as unknown as MarketAnalysisRepository
        );
    });

    it('returns an empty result when there are no jobs', async () => {
        repository.getSkillDemand.mockResolvedValue({
            totalJobsAnalyzed: 0,
            skills: [],
        });

        expect(await service.getSkillDemand()).toEqual({
            totalJobsAnalyzed: 0,
            skills: [],
        });
    });

    it('calculates demand percentages to one decimal place', async () => {
        repository.getSkillDemand.mockResolvedValue({
            totalJobsAnalyzed: 3,
            skills: [
                {
                    skillId: 1,
                    name: 'PHP',
                    category: 'Programming Languages',
                    jobCount: 2,
                    mustHaveCount: 1,
                    niceToHaveCount: 1,
                },
                {
                    skillId: 2,
                    name: 'Docker',
                    category: 'DevOps',
                    jobCount: 1,
                    mustHaveCount: 1,
                    niceToHaveCount: 0,
                },
            ],
        });

        const result = await service.getSkillDemand();

        expect(result.skills).toEqual([
            {
                skillId: 1,
                name: 'PHP',
                category: 'Programming Languages',
                jobCount: 2,
                mustHaveCount: 1,
                niceToHaveCount: 1,
                demandPercentage: 66.7,
            },
            {
                skillId: 2,
                name: 'Docker',
                category: 'DevOps',
                jobCount: 1,
                mustHaveCount: 1,
                niceToHaveCount: 0,
                demandPercentage: 33.3,
            },
        ]);
    });

    it('calculates 100% demand correctly', async () => {
        repository.getSkillDemand.mockResolvedValue({
            totalJobsAnalyzed: 2,
            skills: [{
                skillId: 1,
                name: 'TypeScript',
                category: 'Programming Languages',
                jobCount: 2,
                mustHaveCount: 2,
                niceToHaveCount: 0,
            }],
        });

        const result = await service.getSkillDemand();

        expect(result.skills[0].demandPercentage).toBe(100);
    });

    it('propagates repository errors', async () => {
        const error = new Error('Database unavailable');

        repository.getSkillDemand.mockRejectedValue(error);

        await expect(service.getSkillDemand()).rejects.toBe(error);
    });
});
