import { z } from 'zod';

import {
    employmentTypeSchema,
    jobSkillRequirementSchema,
    languageRequirementSchema,
    senioritySchema,
    workModelSchema,
} from './job';

export const extractedJobSchema = z.object({
    company: z.string().trim().min(1).max(255).nullable(),
    title: z.string().trim().min(1).max(255).nullable(),
    location: z.string().trim().min(1).max(255).nullable(),
    workModel: workModelSchema.nullable(),
    employmentType: employmentTypeSchema.nullable(),
    seniority: senioritySchema.nullable(),
    primaryRole: z.string().trim().min(1).max(100).nullable(),
    yearsRequired: z.string().trim().min(1).max(100).nullable(),
    educationRequirement: z.string().trim().min(1).max(2000).nullable(),
    languageRequirements: z.array(z.object({
        language: z.string().regex(/^[a-z]{2}$/),
        requirement: languageRequirementSchema,
    })),
    salaryRate: z.string().trim().min(1).max(1000).nullable(),
    skills: z.array(z.object({
        name: z.string().trim().min(1).max(255),
        category: z.string().trim().min(1).max(100).nullable(),
        requirement: jobSkillRequirementSchema.nullable(),
    })),
});

export const jobAdvertisementAnalysisSchema = z.object({
    dateFound: z.iso.date(),
    originalText: z.string().trim().min(50).max(30_000),
    sourceUrl: z.url().nullable().optional(),
    proposal: extractedJobSchema,
    requiresReview: z.boolean(),
});

export type JobAdvertisementAnalysis = z.infer<typeof jobAdvertisementAnalysisSchema>;
