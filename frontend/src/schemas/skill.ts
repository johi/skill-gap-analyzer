import { z } from 'zod';

export const skillSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    category: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const skillsSchema = z.array(skillSchema);

export type Skill = z.infer<typeof skillSchema>;