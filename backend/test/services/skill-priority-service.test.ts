
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { SkillPriorityService } from '@/services/skill-priority-service';

import type {
    SkillGapAnalysisService,
} from '@/services/skill-gap-analysis-service';

describe('SkillPriorityService', () => {
    const skillGapAnalysisService = {
        getSkillGaps: vi.fn(),
    };

    let service: SkillPriorityService;

    beforeEach(() => {
        vi.resetAllMocks();

        service = new SkillPriorityService(
            skillGapAnalysisService as unknown as SkillGapAnalysisService
        );
    });

    it('calculates priority using 70/30 weighting', async () => {
        skillGapAnalysisService.getSkillGaps.mockResolvedValue({
            totalJobsAnalyzed: 20,
            skills: [{
                skillId: 1,
                name: 'Docker',
                category: 'DevOps',
                jobCount: 16,
                mustHaveCount: 12,
                niceToHaveCount: 4,
                demandPercentage: 80,
                proficiency: 2,
                gap: 3,
                status: 'assessed',
            }],
        });

        const result = await service.getSkillPriorities();

        const skill = result.skills[0]!;

        expect(skill.demandWeight).toBeCloseTo(0.7);

        const expectedScore =
            100 * Math.pow(0.7, 0.7) * Math.pow(0.6, 0.3);

        expect(skill.priorityScore).toBeCloseTo(expectedScore, 1);
        expect(result.missingInformation).toEqual([]);
    });

    it('gives zero priority to fully proficient skills', async () => {
        skillGapAnalysisService.getSkillGaps.mockResolvedValue({
            totalJobsAnalyzed: 10,
            skills: [{
                skillId: 1,
                name: 'PHP',
                category: 'Programming Languages',
                jobCount: 8,
                mustHaveCount: 8,
                niceToHaveCount: 0,
                demandPercentage: 80,
                proficiency: 5,
                gap: 0,
                status: 'assessed',
            }],
        });

        const result = await service.getSkillPriorities();

        expect(result.skills[0]!.priorityScore).toBe(0);
    });

    it('reports unassessed skills without assigning priority', async () => {
        skillGapAnalysisService.getSkillGaps.mockResolvedValue({
            totalJobsAnalyzed: 10,
            skills: [{
                skillId: 1,
                name: 'Rust',
                category: 'Programming Languages',
                jobCount: 5,
                mustHaveCount: 5,
                niceToHaveCount: 0,
                demandPercentage: 50,
                proficiency: null,
                gap: null,
                status: 'unassessed',
            }],
        });

        const result = await service.getSkillPriorities();

        expect(result.skills[0]).toMatchObject({
            priorityScore: null,
            status: 'unassessed',
        });

        expect(result.missingInformation)
            .toContain('skill_assessments');
    });

    it('reports missing market demand', async () => {
        skillGapAnalysisService.getSkillGaps.mockResolvedValue({
            totalJobsAnalyzed: 0,
            skills: [],
        });

        const result = await service.getSkillPriorities();

        expect(result).toEqual({
            totalJobsAnalyzed: 0,
            skills: [],
            missingInformation: ['market_demand'],
        });
    });

    it('sorts assessed priorities before unassessed skills', async () => {
        skillGapAnalysisService.getSkillGaps.mockResolvedValue({
            totalJobsAnalyzed: 10,
            skills: [
                {
                    skillId: 1,
                    name: 'Rust',
                    category: 'Programming Languages',
                    jobCount: 10,
                    mustHaveCount: 10,
                    niceToHaveCount: 0,
                    demandPercentage: 100,
                    proficiency: null,
                    gap: null,
                    status: 'unassessed',
                },
                {
                    skillId: 2,
                    name: 'Docker',
                    category: 'DevOps',
                    jobCount: 8,
                    mustHaveCount: 8,
                    niceToHaveCount: 0,
                    demandPercentage: 80,
                    proficiency: 2,
                    gap: 3,
                    status: 'assessed',
                },
                {
                    skillId: 3,
                    name: 'PHP',
                    category: 'Programming Languages',
                    jobCount: 5,
                    mustHaveCount: 5,
                    niceToHaveCount: 0,
                    demandPercentage: 50,
                    proficiency: 4,
                    gap: 1,
                    status: 'assessed',
                },
            ],
        });

        const result = await service.getSkillPriorities();

        expect(result.skills.map((skill) => skill.name))
            .toEqual(['Docker', 'PHP', 'Rust']);
    });

    it('propagates analysis errors', async () => {
        const error = new Error('Analysis unavailable');

        skillGapAnalysisService.getSkillGaps.mockRejectedValue(error);

        await expect(service.getSkillPriorities())
            .rejects.toBe(error);
    });
});
