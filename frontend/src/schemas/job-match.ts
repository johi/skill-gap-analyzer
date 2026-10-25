import { z } from 'zod';

export const matchedJobSkillSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    category: z.string(),
    requirement: z.enum(['must_have', 'nice_to_have']),
    proficiency: z.number().int().min(0).max(5).nullable(),
    matchFactor: z.number().min(0).max(1).nullable(),
    status: z.enum(['assessed', 'unassessed']),
});

export const jobMatchResultSchema = z.object({
    matchPercentage: z.number().min(0).max(100).nullable(),
    assessmentCoverage: z.number().min(0).max(100),
    totalSkills: z.number().int().nonnegative(),
    assessedSkills: z.number().int().nonnegative(),
    skills: z.array(matchedJobSkillSchema),
    missingInformation: z.array(
        z.enum(['job_skills', 'skill_assessments'])
    ),
});

export type MatchedJobSkill = z.infer<typeof matchedJobSkillSchema>;
export type JobMatchResult = z.infer<typeof jobMatchResultSchema>;
