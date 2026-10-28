import { listPaginationSchema, validateSort } from '@/schemas/list-pagination';
import { paginateAnalysis } from '@/services/paginate-analysis';

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
        fastify.get('/skill-demand', async (request) => {
            const raw = request.query as Record<string, unknown>;
            const result = await marketAnalysisService.getSkillDemand();
            if (!('page' in raw || 'pageSize' in raw)) return result;
            const query = listPaginationSchema.parse(raw);
            validateSort(query.sortBy, ['name','category','jobCount','mustHaveCount','niceToHaveCount','demandPercentage']);
            return paginateAnalysis(result, query);
        });

        fastify.get('/skill-gaps', async (request) => {
            const raw = request.query as Record<string, unknown>;
            const result = await skillGapAnalysisService.getSkillGaps();
            if (!('page' in raw || 'pageSize' in raw)) return result;
            const query = listPaginationSchema.parse(raw);
            validateSort(query.sortBy, ['name','category','jobCount','mustHaveCount','niceToHaveCount','demandPercentage','proficiency','gap','status']);
            return paginateAnalysis(result, query);
        });

        fastify.get('/skill-priorities', async (request) => {
            const raw = request.query as Record<string, unknown>;
            const result = await skillPriorityService.getSkillPriorities();
            if (!('page' in raw || 'pageSize' in raw)) return result;
            const query = listPaginationSchema.parse(raw);
            validateSort(query.sortBy, ['name','category','jobCount','demandPercentage','demandWeight','proficiency','gap','priorityScore','status']);
            return paginateAnalysis(result, query);
        });
    };
}
