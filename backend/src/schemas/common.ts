import { z } from 'zod';

export const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const skillIdParamSchema = z.object({
    skillId: z.coerce.number().int().positive(),
});