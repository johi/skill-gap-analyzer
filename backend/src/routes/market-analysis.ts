
import type { FastifyPluginAsync } from 'fastify';

import type { MarketAnalysisService } from '@/services/market-analysis-service';
import type { SkillGapAnalysisService } from '@/services/skill-gap-analysis-service';
import type { SkillPriorityService } from '@/services/skill-priority-service';

export function createMarketAnalysisRoutes(
    marketAnalysisService: MarketAnalysisService,
    skillGapAnalysisService: SkillGapAnalysisService,
    skillPriorityService: SkillPriorityService
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.get('/skill-demand', async () => {
            return marketAnalysisService.getSkillDemand();
        });

        fastify.get('/skill-gaps', async () => {
            return skillGapAnalysisService.getSkillGaps();
        });

        fastify.get('/skill-priorities', async () => {
            return skillPriorityService.getSkillPriorities();
        });
    };
}
