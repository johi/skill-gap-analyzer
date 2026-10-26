import { z } from 'zod';

import {
    employmentTypeSchema,
    jobSkillRequirementSchema,
    languageRequirementSchema,
    senioritySchema,
    workModelSchema,
} from './job';

// This is a proposal, NOT a CreateJobInput. Missing facts remain null.
export const jobAdvertisementRequestSchema = z.object({
    advertisement: z.string().trim().min(50).max(30_000),
    sourceUrl: z.url().max(2048).refine(url => /^https?:\/\//i.test(url), 'Expected an HTTP or HTTPS URL').optional(),
});

export const jobUrlAnalysisRequestSchema = z.object({
    url: z.url().max(2048),
});

export const jobProposalSchema = z.object({
    applicationDeadline: z.iso.date().nullable().optional(),
    contacts: z.array(z.object({
        name: z.string().trim().max(255).nullable(),
        role: z.string().trim().max(255).nullable(),
        email: z.email().max(255).nullable(),
        phone: z.string().trim().max(100).nullable(),
    })).optional(),
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
    })).superRefine((items, ctx) => {
        const seen = new Set<string>();
        for (const [index, item] of items.entries()) {
            if (seen.has(item.language)) {
                ctx.addIssue({
                    code: 'custom',
                    path: [index, 'language'],
                    message: 'Duplicate language requirement',
                });
            }
            seen.add(item.language);
        }
    }),
    salaryRate: z.string().trim().min(1).max(1000).nullable(),
    skills: z.array(z.object({
        name: z.string().trim().min(1).max(255),
        category: z.string().trim().min(1).max(100).nullable(),
        requirement: jobSkillRequirementSchema.nullable(),
    })).superRefine((items, ctx) => {
        const seen = new Set<string>();
        for (const [index, item] of items.entries()) {
            const key = item.name.toLocaleLowerCase('en-US');
            if (seen.has(key)) {
                ctx.addIssue({
                    code: 'custom',
                    path: [index, 'name'],
                    message: 'Duplicate skill name',
                });
            }
            seen.add(key);
        }
    }),
});

export const jobAdvertisementAnalysisSchema = z.object({
    dateFound: z.iso.date(),
    originalText: z.string().min(50).max(30_000),
    sourceUrl: z.url().nullable(),
    proposal: jobProposalSchema,
    requiresReview: z.boolean(),
});

export type JobProposal = z.infer<typeof jobProposalSchema>;
export type ExtractedJob = z.infer<typeof jobProposalSchema>;
export type JobAdvertisementAnalysis = z.infer<typeof jobAdvertisementAnalysisSchema>;
