import { z } from 'zod';

export const userSkillSchema = z.object({
    skillId: z.number().int().positive(),
    name: z.string(),
    category: z.string(),
    level: z.number(),
    updatedAt: z.string(),
});

export const userSkillsSchema = z.array(userSkillSchema);

export const userSkillAssessmentSchema = z.object({
    skillId: z.number().int().positive(),
    level: z.number(),
    updatedAt: z.string(),
});

export type UserSkill =
    z.infer<typeof userSkillSchema>;

export type UserSkillAssessment =
    z.infer<typeof userSkillAssessmentSchema>;