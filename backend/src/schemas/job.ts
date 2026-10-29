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
export const languageRequirementSchema = z.enum([
    'preferred',
    'required',
]);

export const jobLanguageRequirementSchema = z.object({
    language: z.string()
        .trim()
        .regex(/^[a-z]{2}$/),

    requirement: languageRequirementSchema,
});

export const senioritySchema = z.enum([
    'junior',
    'mid',
    'senior',
    'lead',
    'staff',
    'principal',
]);

export const applicationStatusSchema = z.enum([
    'not_applied',
    'applied',
    'interview',
    'rejected',
    'offer',
    'expired',
]);

export const jobContactInputSchema = z.object({
    name: z.string().trim().max(255).nullable().optional(),
    role: z.string().trim().max(255).nullable().optional(),
    email: z.email().max(255).nullable().optional(),
    phone: z.string().trim().max(100).nullable().optional(),
}).refine(
    (contact) => [contact.name, contact.role, contact.email, contact.phone]
        .some((value) => value != null && value.length > 0),
    { message: 'A contact must contain at least one detail' }
);

export const jobContactResponseSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().nullable(),
    role: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
});

export const createJobSchema = z.object({
    dateFound: z.iso.date(),
    applicationDeadline: z.iso.date().nullable().optional(),

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

    languageRequirements: z.array(jobLanguageRequirementSchema)
        .refine(
            (requirements) =>
                new Set(requirements.map(({ language }) => language)).size === requirements.length,
            {
                message: 'Language requirements must contain unique languages',
            }
        )
        .default([]),

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

    contacts: z.array(jobContactInputSchema).optional(),


    skills: z.array(jobSkillSchema)
        .default([]),
});

export const updateJobSchema = createJobSchema;
export const jobResponseSchema = z.object({
    id: z.number().int().positive(),
    dateFound: z.iso.date(),
    applicationDeadline: z.iso.date().nullable(),
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
    languageRequirements: z.array(jobLanguageRequirementSchema),
    salaryRate: z.string().nullable(),
    interest: z.number().int().min(0).max(100).nullable(),
    applyStatus: applicationStatusSchema.nullable(),
    contacts: z.array(jobContactResponseSchema),
    createdAt: z.date(),
    updatedAt: z.date(),
    skills: z.array(z.object({
        id: z.number().int().positive(),
        name: z.string(),
        category: skillCategorySchema,
        requirement: jobSkillRequirementSchema,
    })).optional(),
});

export const listJobsQuerySchema = z.object({
    search: z.string().trim().max(255).optional().default(''),
    workModel: workModelSchema.optional(),
    seniority: senioritySchema.optional(),
    employmentType: employmentTypeSchema.optional(),
    applyStatus: applicationStatusSchema.optional(),
    sortBy: z.enum(['dateFound', 'applicationDeadline', 'company', 'interest', 'matchPercentage'])
        .optional().default('dateFound'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().pipe(z.union([
        z.literal(10), z.literal(25), z.literal(50),
    ])).optional().default(25),
});

export const jobsResponseSchema = z.object({
    data: z.array(jobResponseSchema.extend({
        matchPercentage: z.number().min(0).max(100).nullable(),
        assessmentCoverage: z.number().min(0).max(100),
    })),
    pagination: z.object({
        page: z.number().int().positive(),
        pageSize: z.union([z.literal(10), z.literal(25), z.literal(50)]),
        totalItems: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
    }),
});

export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
export type WorkModel = z.infer<typeof workModelSchema>;
export type EmploymentType = z.infer<typeof employmentTypeSchema>;
export type Seniority = z.infer<typeof senioritySchema>;
export type LanguageRequirement = z.infer<typeof languageRequirementSchema>;
export type JobLanguageRequirement = z.infer<typeof jobLanguageRequirementSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export type JobSkillInput = z.infer<typeof jobSkillSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export type JobContactInput = z.infer<typeof jobContactInputSchema>;
