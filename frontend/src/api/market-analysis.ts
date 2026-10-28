import { paginationSchema, queryString, type ListQuery } from '@/schemas/list-pagination';
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

export function getSkillDemand(query?: ListQuery): Promise<SkillDemandResult> {
    return apiRequest(
        `/api/v1/analysis/skill-demand${query ? '?' + queryString(query) : ''}`, 
        skillDemandResultSchema
    );
}

export function getSkillGaps(query?: ListQuery): Promise<SkillGapResult> {
    return apiRequest(
        `/api/v1/analysis/skill-gaps${query ? '?' + queryString(query) : ''}`, 
        skillGapResultSchema
    );
}

export function getSkillPriorities(query?: ListQuery): Promise<SkillPriorityResult> {
    return apiRequest(
        `/api/v1/analysis/skill-priorities${query ? '?' + queryString(query) : ''}`, 
        skillPriorityResultSchema
    );
}