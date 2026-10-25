
import type { z } from 'zod';

import type {
    skillDemandSchema,
    skillDemandResultSchema,
    skillGapSchema,
    skillGapResultSchema,
} from '@/schemas/market-analysis';

export type SkillDemand = z.infer<
    typeof skillDemandSchema
>;

export type SkillDemandResult = z.infer<
    typeof skillDemandResultSchema
>;

export type SkillGap = z.infer<
    typeof skillGapSchema
>;

export type SkillGapResult = z.infer<
    typeof skillGapResultSchema
>;
