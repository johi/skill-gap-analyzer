import { z } from 'zod';

export const userSkillSchema = z.object({
    level: z.number()
        .int()
        .min(0)
        .max(5),
});

export type UserSkillInput = z.infer<typeof userSkillSchema>;