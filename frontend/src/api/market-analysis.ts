import { apiRequest } from '@/api/client';

import { skillDemandResultSchema } from '@/schemas/market-analysis';

import type { SkillDemandResult } from '@/types/market-analysis';

export function getSkillDemand(): Promise<SkillDemandResult> {
    return apiRequest(
        '/api/v1/analysis/skill-demand',
        skillDemandResultSchema
    );
}