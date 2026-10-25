import { apiRequest } from '@/api/client';

import {
    skillDemandResultSchema,
    skillGapResultSchema,
    skillPriorityResultSchema,
} from '@/schemas/market-analysis';

import type {
    SkillDemandResult,
    SkillGapResult,
    SkillPriorityResult,
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

export function getSkillPriorities(): Promise<SkillPriorityResult> {
    return apiRequest(
        '/api/v1/analysis/skill-priorities',
        skillPriorityResultSchema
    );
}