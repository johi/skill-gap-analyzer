import { z } from 'zod';
import {
  applicationStatusSchema,
  employmentTypeSchema,
  jobWithSkillsSchema,
  senioritySchema,
  workModelSchema,
} from './job';

export const jobSortBySchema = z.enum([
  'dateFound', 'company', 'interest', 'matchPercentage',
]);
export const jobSortOrderSchema = z.enum(['asc', 'desc']);
export const jobPageSizeSchema = z.union([
  z.literal(10), z.literal(25), z.literal(50),
]);

export const jobListQuerySchema = z.object({
  search: z.string().trim().max(255).default(''),
  workModel: workModelSchema.optional(),
  seniority: senioritySchema.optional(),
  employmentType: employmentTypeSchema.optional(),
  applyStatus: applicationStatusSchema.optional(),
  sortBy: jobSortBySchema.default('dateFound'),
  sortOrder: jobSortOrderSchema.default('desc'),
  page: z.number().int().positive().default(1),
  pageSize: jobPageSizeSchema.default(25),
});

export const paginatedJobsSchema = z.object({
  data: z.array(jobWithSkillsSchema.extend({
    matchPercentage: z.number().min(0).max(100).nullable(),
    assessmentCoverage: z.number().min(0).max(100),
  })),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: jobPageSizeSchema,
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type JobListQuery = z.infer<typeof jobListQuerySchema>;
export type PaginatedJobs = z.infer<typeof paginatedJobsSchema>;
