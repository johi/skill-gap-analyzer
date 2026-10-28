import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().int().positive(), pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
});

export const listQuerySchema = z.object({
  search: z.string().default(''), sortBy: z.string().default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().refine(n => [10,25,50].includes(n)).default(25),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export type Pagination = z.infer<typeof paginationSchema>;

export function queryString(query: ListQuery): string {
  return new URLSearchParams({search: query.search, sortBy: query.sortBy, sortOrder: query.sortOrder,
    page: String(query.page), pageSize: String(query.pageSize)}).toString();
}
