import { z } from 'zod';

import { skillCategorySchema } from './skill';

export const jobSkillRequirementSchema = z.enum([
    'must_have',
    'nice_to_have',
]);

export const jobSkillSchema = z.object({
    name: z.string()
        .trim()
        .min(1)
        .max(255),

    category: skillCategorySchema,

    requirement: jobSkillRequirementSchema,
});

export const createJobSchema = z.object({
    dateFound: z.iso.date(),

    company: z.string()
        .trim()
        .min(1)
        .max(255),

    title: z.string()
        .trim()
        .min(1)
        .max(255),

    sourceUrl: z.url().nullable().optional(),

    originalText: z.string()
        .trim()
        .min(1)
        .nullable()
        .optional(),

    location: z.string()
        .trim()
        .max(255)
        .nullable()
        .optional(),

    workModel: z.string()
        .trim()
        .max(50)
        .nullable()
        .optional(),

    employmentType: z.string()
        .trim()
        .max(100)
        .nullable()
        .optional(),

    seniority: z.string()
        .trim()
        .max(100)
        .nullable()
        .optional(),

    primaryRole: z.string()
        .trim()
        .max(100)
        .nullable()
        .optional(),

    yearsRequired: z.string()
        .trim()
        .max(100)
        .nullable()
        .optional(),

    educationRequirement: z.string()
        .trim()
        .nullable()
        .optional(),

    danishRequired: z.string()
        .trim()
        .max(100)
        .nullable()
        .optional(),

    salaryRate: z.string()
        .trim()
        .nullable()
        .optional(),

    interest: z.number()
        .int()
        .min(0)
        .max(100)
        .nullable()
        .optional(),

    applyStatus: z.string()
        .trim()
        .max(50)
        .nullable()
        .optional(),

    gapNotes: z.string()
        .trim()
        .nullable()
        .optional(),

    originalMatch: z.number()
        .min(0)
        .max(100)
        .nullable()
        .optional(),

    skills: z.array(jobSkillSchema)
        .default([]),
});

export const updateJobSchema = createJobSchema;

export type JobSkillInput = z.infer<typeof jobSkillSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;