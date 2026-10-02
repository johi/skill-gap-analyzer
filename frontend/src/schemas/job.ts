import { z } from 'zod';

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

export const jobSkillRequirementSchema = z.enum([
    'must_have',
    'nice_to_have',
]);

export const jobSkillSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    category: z.string(),
    requirement: jobSkillRequirementSchema,
});

export const jobSchema = z.object({
    id: z.number().int().positive(),
    dateFound: z.string(),
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
    interest: z.number().nullable(),
    applyStatus: applicationStatusSchema.nullable(),
    gapNotes: z.string().nullable(),
    originalMatch: z.number().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const jobsSchema = z.array(jobSchema);

export const jobWithSkillsSchema = jobSchema.extend({
    skills: z.array(jobSkillSchema),
});

export type Job = z.infer<typeof jobSchema>;
export type JobSkillRequirement =
    z.infer<typeof jobSkillRequirementSchema>;
export type JobSkill = z.infer<typeof jobSkillSchema>;
export type JobWithSkills =
    z.infer<typeof jobWithSkillsSchema>;
export type WorkModel =
    z.infer<typeof workModelSchema>;
export type EmploymentType =
    z.infer<typeof employmentTypeSchema>;
export type Seniority =
    z.infer<typeof senioritySchema>;
export type DanishRequirement =
    z.infer<typeof danishRequiredSchema>;
export type ApplicationStatus =
    z.infer<typeof applicationStatusSchema>;