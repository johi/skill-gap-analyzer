
import type { FastifyPluginAsync } from 'fastify';

import type { MarketAnalysisService } from '@/services/market-analysis-service';
import type { SkillGapAnalysisService } from '@/services/skill-gap-analysis-service';

export function createMarketAnalysisRoutes(
    marketAnalysisService: MarketAnalysisService,
    skillGapAnalysisService: SkillGapAnalysisService
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.get('/skill-demand', async () => {
            return marketAnalysisService.getSkillDemand();
        });

        fastify.get('/skill-gaps', async () => {
            return skillGapAnalysisService.getSkillGaps();
        });
    };
}
