import type { z } from 'zod';

import type {
    skillDemandSchema,
    skillDemandResultSchema,
} from '@/schemas/market-analysis';

export type SkillDemand = z.infer<
    typeof skillDemandSchema
>;

export type SkillDemandResult = z.infer<
    typeof skillDemandResultSchema
>;