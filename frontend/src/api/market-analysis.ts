import { apiRequest } from '@/api/client';

import {
    skillDemandResultSchema,
    skillGapResultSchema,
} from '@/schemas/market-analysis';

import type {
    SkillDemandResult,
    SkillGapResult,
} from '@/types/market-analysis';

export function getSkillDemand(): Promise<SkillDemandResult> {
    return apiRequest(
        '/api/v1/analysis/skill-demand',
        skillDemandResultSchema
    );
}

export function getSkillGaps(): Promise<SkillGapResult> {
    return apiRequest(
        '/api/v1/analysis/skill-gaps',
        skillGapResultSchema
    );
}
