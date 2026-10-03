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

export const workModelSchema = z.enum([
    'onsite',
    'hybrid',
    'remote',
]);

export const employmentTypeSchema = z.enum([
    'full_time',
    'part_time',
    'contract',
    'temporary',
]);

export const senioritySchema = z.enum([
    'junior',
    'mid',
    'senior',
    'lead',
    'staff',
    'principal',
]);

export const danishRequiredSchema = z.enum([
    'no',
    'preferred',
    'required',
]);

export const applicationStatusSchema = z.enum([
    'not_applied',
    'applied',
    'interview',
    'rejected',
    'offer',
    'expired',
]);

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

    workModel: workModelSchema
        .nullable()
        .optional(),

    employmentType: employmentTypeSchema
        .nullable()
        .optional(),

    seniority: senioritySchema
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

    danishRequired: danishRequiredSchema
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

    applyStatus: applicationStatusSchema
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
export const jobResponseSchema = z.object({
    id: z.number().int().positive(),
    dateFound: z.iso.date(),
    company: z.string(),
    title: z.string(),
    sourceUrl: z.string().nullable(),
    originalText: z.string().nullable(),
    location: z.string().nullable(),
    workModel: workModelSchema.nullable(),
    employmentType: employmentTypeSchema.nullable(),
    seniority: senioritySchema.nullable(),
    primaryRole: z.string().nullable(),
    yearsRequired: z.string().nullable(),
    educationRequirement: z.string().nullable(),
    danishRequired: danishRequiredSchema.nullable(),
    salaryRate: z.string().nullable(),
    interest: z.number().int().min(0).max(100).nullable(),
    applyStatus: applicationStatusSchema.nullable(),
    gapNotes: z.string().nullable(),
    originalMatch: z.number().min(0).max(100).nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const jobsResponseSchema = z.array(jobResponseSchema);
export type WorkModel = z.infer<typeof workModelSchema>;
export type EmploymentType = z.infer<typeof employmentTypeSchema>;
export type Seniority = z.infer<typeof senioritySchema>;
export type DanishRequirement = z.infer<typeof danishRequiredSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export type JobSkillInput = z.infer<typeof jobSkillSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;