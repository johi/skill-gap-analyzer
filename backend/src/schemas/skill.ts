import { z } from 'zod';
import { normalizeSkillCategory } from '@/services/skill-category';

export const skillCategorySchema = z.string()
    .transform(normalizeSkillCategory)
    .pipe(z.string().min(1).max(100));

export const createSkillSchema = z.object({
    name: z.string()
        .trim()
        .min(1)
        .max(255),

    category: skillCategorySchema,
});

export const updateSkillSchema = createSkillSchema;

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;