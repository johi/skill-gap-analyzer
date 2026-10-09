import { z } from 'zod';

import {
    createJobSchema,
    jobSkillRequirementSchema,
} from './job';
import { skillCategorySchema } from './skill';

export const jobDatasetVersionSchema = z.literal(1);

export const jobDatasetSchema = z.object({
    version: jobDatasetVersionSchema,

    exportedAt: z.iso.datetime()
        .optional(),

    jobs: z.array(createJobSchema),
});

export const analyzedSkillSchema = z.object({
    name: z.string(),
    category: skillCategorySchema,
    requirement: jobSkillRequirementSchema,

    resolution: z.enum([
        'existing',
        'new',
        'review_required',
    ]),

    canonicalSkillId: z.number()
        .int()
        .positive()
        .nullable(),

    canonicalName: z.string(),

    conflictingRequirements: z.array(
        jobSkillRequirementSchema
    ).optional(),
});

export const analyzedJobSchema = z.object({
    job: createJobSchema,
    skills: z.array(analyzedSkillSchema),
});

export const jobImportAnalysisSchema = z.object({
    version: jobDatasetVersionSchema,

    totalJobs: z.number()
        .int()
        .nonnegative(),

    requiresReview: z.boolean(),

    jobs: z.array(analyzedJobSchema),
});

export type JobDataset =
    z.infer<typeof jobDatasetSchema>;

export type JobImportAnalysis =
    z.infer<typeof jobImportAnalysisSchema>;