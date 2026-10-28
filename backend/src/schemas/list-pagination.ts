import { z } from 'zod';

export const listPaginationSchema = z.object({
    search: z.string().trim().max(255).default(''),
    sortBy: z.string().default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().refine(n => [10, 25, 50].includes(n)).default(25),
});
export type ListPaginationQuery = z.infer<typeof listPaginationSchema>;
export function pagination(page: number, pageSize: number, totalItems: number) {
    const totalPages = Math.ceil(totalItems / pageSize);
    return { page: Math.min(page, Math.max(1, totalPages)), pageSize, totalItems, totalPages };
}
export function validateSort<T extends string>(sortBy: string, allowed: readonly T[]): T {
    return z.enum(allowed as [T, ...T[]]).parse(sortBy);
}
