import { z } from 'zod';

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
    workModel: z.string().nullable(),
    employmentType: z.string().nullable(),
    seniority: z.string().nullable(),
    primaryRole: z.string().nullable(),
    yearsRequired: z.string().nullable(),
    educationRequirement: z.string().nullable(),
    danishRequired: z.string().nullable(),
    salaryRate: z.string().nullable(),
    interest: z.number().nullable(),
    applyStatus: z.string().nullable(),
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