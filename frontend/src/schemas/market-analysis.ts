import { paginationSchema } from '@/schemas/list-pagination';
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
    pagination: paginationSchema.optional(),
});

export const skillGapSchema = skillDemandSchema.extend({
    proficiency: z.number().int().min(0).max(5).nullable(),
    gap: z.number().int().min(0).max(5).nullable(),
    status: z.enum(['assessed', 'unassessed']),
});

export const skillGapResultSchema = z.object({
    totalJobsAnalyzed: z.number().int().nonnegative(),
    skills: z.array(skillGapSchema),
    pagination: paginationSchema.optional(),
});

export const skillPrioritySchema = skillGapSchema.extend({
    demandWeight: z.number().min(0).max(1),
    priorityScore: z.number().min(0).max(100).nullable(),
});

export const skillPriorityResultSchema = z.object({
    totalJobsAnalyzed: z.number().int().nonnegative(),
    skills: z.array(skillPrioritySchema),
    pagination: paginationSchema.optional(),
    missingInformation: z.array(
        z.enum(['market_demand', 'skill_assessments'])
    ),
});