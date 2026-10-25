
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { SkillGapAnalysisService } from '@/services/skill-gap-analysis-service';

import type {
    MarketAnalysisService,
} from '@/services/market-analysis-service';

import type {
    UserSkillRepository,
} from '@/repositories/user-skill-repository';

describe('SkillGapAnalysisService', () => {
    const marketAnalysisService = {
        getSkillDemand: vi.fn(),
    };

    const userSkillRepository = {
        findAll: vi.fn(),
    };

    let service: SkillGapAnalysisService;

    beforeEach(() => {
        vi.resetAllMocks();

        service = new SkillGapAnalysisService(
            marketAnalysisService as unknown as MarketAnalysisService,
            userSkillRepository as unknown as UserSkillRepository
        );
    });

    it('calculates gaps for assessed skills', async () => {
        marketAnalysisService.getSkillDemand.mockResolvedValue({
            totalJobsAnalyzed: 4,
            skills: [
                {
                    skillId: 1,
                    name: 'PHP',
                    category: 'Programming Languages',
                    jobCount: 3,
                    mustHaveCount: 2,
                    niceToHaveCount: 1,
                    demandPercentage: 75,
                },
                {
                    skillId: 2,
                    name: 'Docker',
                    category: 'DevOps',
                    jobCount: 2,
                    mustHaveCount: 2,
                    niceToHaveCount: 0,
                    demandPercentage: 50,
                },
            ],
        });

        userSkillRepository.findAll.mockResolvedValue([
            { skillId: 1, level: 5 },
            { skillId: 2, level: 3 },
        ]);

        const result = await service.getSkillGaps();

        expect(result.totalJobsAnalyzed).toBe(4);
        expect(result.skills).toEqual([
            expect.objectContaining({
                skillId: 1,
                proficiency: 5,
                gap: 0,
                status: 'assessed',
                demandPercentage: 75,
            }),
            expect.objectContaining({
                skillId: 2,
                proficiency: 3,
                gap: 2,
                status: 'assessed',
                demandPercentage: 50,
            }),
        ]);
    });

    it('identifies unassessed skills', async () => {
        marketAnalysisService.getSkillDemand.mockResolvedValue({
            totalJobsAnalyzed: 1,
            skills: [{
                skillId: 3,
                name: 'Rust',
                category: 'Programming Languages',
                jobCount: 1,
                mustHaveCount: 1,
                niceToHaveCount: 0,
                demandPercentage: 100,
            }],
        });

        userSkillRepository.findAll.mockResolvedValue([]);

        const result = await service.getSkillGaps();

        expect(result.skills[0]).toMatchObject({
            proficiency: null,
            gap: null,
            status: 'unassessed',
        });
    });

    it('treats proficiency zero as assessed', async () => {
        marketAnalysisService.getSkillDemand.mockResolvedValue({
            totalJobsAnalyzed: 1,
            skills: [{
                skillId: 1,
                name: 'Kubernetes',
                category: 'DevOps',
                jobCount: 1,
                mustHaveCount: 1,
                niceToHaveCount: 0,
                demandPercentage: 100,
            }],
        });

        userSkillRepository.findAll.mockResolvedValue([
            { skillId: 1, level: 0 },
        ]);

        const result = await service.getSkillGaps();

        expect(result.skills[0]).toMatchObject({
            proficiency: 0,
            gap: 5,
            status: 'assessed',
        });
    });

    it('returns an empty result when there is no market demand', async () => {
        marketAnalysisService.getSkillDemand.mockResolvedValue({
            totalJobsAnalyzed: 0,
            skills: [],
        });

        userSkillRepository.findAll.mockResolvedValue([
            { skillId: 1, level: 4 },
        ]);

        expect(await service.getSkillGaps()).toEqual({
            totalJobsAnalyzed: 0,
            skills: [],
        });
    });

    it('propagates data retrieval errors', async () => {
        const error = new Error('Database unavailable');

        marketAnalysisService.getSkillDemand.mockRejectedValue(error);
        userSkillRepository.findAll.mockResolvedValue([]);

        await expect(service.getSkillGaps())
            .rejects.toBe(error);
    });
});
