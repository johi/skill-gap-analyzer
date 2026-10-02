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
    level: skillLevelSchema,
});

export type SkillLevel = z.infer<typeof skillLevelSchema>;
export type UserSkillInput = z.infer<typeof userSkillSchema>;