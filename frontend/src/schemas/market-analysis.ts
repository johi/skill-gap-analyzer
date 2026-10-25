import { z } from 'zod';

export const skillDemandSchema = z.object({
    skillId: z.number().int(),
    name: z.string(),
    category: z.string(),
    jobCount: z.number().int().nonnegative(),
    mustHaveCount: z.number().int().nonnegative(),
    niceToHaveCount: z.number().int().nonnegative(),
    demandPercentage: z.number().min(0).max(100),
});

export const skillDemandResultSchema = z.object({
    totalJobsAnalyzed: z.number().int().nonnegative(),
    skills: z.array(skillDemandSchema),
});