import type { FastifyPluginAsync } from 'fastify';

import type { MarketAnalysisService } from '@/services/market-analysis-service';

export function createMarketAnalysisRoutes(
    marketAnalysisService: MarketAnalysisService
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.get('/skill-demand', async () => {
            return marketAnalysisService.getSkillDemand();
        });
    };
}
