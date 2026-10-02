import { z } from 'zod';

export const skillLevelSchema = z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
]);

export const userSkillSchema = z.object({
    skillId: z.number().int().positive(),
    name: z.string(),
    category: z.string(),
    level: skillLevelSchema,
    updatedAt: z.string(),
});

export const userSkillsSchema = z.array(userSkillSchema);

export const userSkillAssessmentSchema = z.object({
    skillId: z.number().int().positive(),
    level: skillLevelSchema,
    updatedAt: z.string(),
});

export type UserSkill =
    z.infer<typeof userSkillSchema>;

export type UserSkillAssessment =
    z.infer<typeof userSkillAssessmentSchema>;

export type SkillLevel =
    z.infer<typeof skillLevelSchema>;