
import { z } from 'zod';

import {
    applicationStatusSchema,
    employmentTypeSchema,
    jobLanguageRequirementSchema,
    jobSkillRequirementSchema,
    senioritySchema,
    workModelSchema,
} from './job';

export const importedJobSkillSchema = z.object({
    name: z.string().trim().min(1).max(255),
    category: z.string().trim().min(1).max(100),
    requirement: jobSkillRequirementSchema,
});

export const importedJobSchema = z.object({
    dateFound: z.iso.date(),
    company: z.string().trim().min(1).max(255),
    title: z.string().trim().min(1).max(255),

    sourceUrl: z.url().nullable().optional(),
    originalText: z.string().trim().min(1).nullable().optional(),
    location: z.string().trim().max(255).nullable().optional(),

    workModel: workModelSchema.nullable().optional(),
    employmentType: employmentTypeSchema.nullable().optional(),
    seniority: senioritySchema.nullable().optional(),

    primaryRole: z.string().trim().max(100).nullable().optional(),
    yearsRequired: z.string().trim().max(100).nullable().optional(),
    educationRequirement: z.string().trim().nullable().optional(),

    languageRequirements: z.array(
        jobLanguageRequirementSchema
    ).refine(
        (requirements) =>
            new Set(
                requirements.map(({ language }) => language)
            ).size === requirements.length,
        {
            message: 'Language requirements must contain unique languages',
        }
    ).default([]),

    salaryRate: z.string().trim().nullable().optional(),
    interest: z.number().int().min(0).max(100).nullable().optional(),
    applyStatus: applicationStatusSchema.nullable().optional(),
    gapNotes: z.string().trim().nullable().optional(),
    originalMatch: z.number().min(0).max(100).nullable().optional(),

    skills: z.array(importedJobSkillSchema).default([]),
});

export const jobDatasetSchema = z.object({
    version: z.literal(1),
    exportedAt: z.iso.datetime().optional(),
    jobs: z.array(importedJobSchema),
});

export type ImportedJob = z.infer<typeof importedJobSchema>;
export type JobDataset = z.infer<typeof jobDatasetSchema>;


export const analyzedSkillSchema = z.object({
    name: z.string(),
    category: z.string(),
    requirement: jobSkillRequirementSchema,

    resolution: z.enum([
        'existing',
        'new',
        'review_required',
    ]),

    canonicalSkillId: z.number().int().positive().nullable(),
    canonicalName: z.string(),

    conflictingRequirements: z.array(
        jobSkillRequirementSchema
    ).optional(),
});

export const jobImportAnalysisSchema = z.object({
    version: z.literal(1),
    totalJobs: z.number().int().nonnegative(),
    requiresReview: z.boolean(),

    jobs: z.array(
        z.object({
            job: importedJobSchema,
            skills: z.array(analyzedSkillSchema),
        })
    ),
});

export type JobImportAnalysis =
    z.infer<typeof jobImportAnalysisSchema>;
