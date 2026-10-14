import { describe, expect, it } from 'vitest';
import { jobListQuerySchema, paginatedJobsSchema } from '../src/schemas/job-list';

describe('UC-04 job list schemas', () => {
  it('uses the agreed defaults', () => {
    expect(jobListQuerySchema.parse({})).toMatchObject({
      search: '', sortBy: 'dateFound', sortOrder: 'desc', page: 1, pageSize: 25,
    });
  });

  it('supports combined filters', () => {
    expect(jobListQuerySchema.parse({
      search: 'backend', workModel: 'hybrid', seniority: 'senior',
      employmentType: 'full_time', applyStatus: 'interview',
      sortBy: 'interest', sortOrder: 'asc', page: 2, pageSize: 10,
    }).page).toBe(2);
  });

  it('rejects unsupported page sizes and invalid filter values', () => {
    expect(jobListQuerySchema.safeParse({ pageSize: 20 }).success).toBe(false);
    expect(jobListQuerySchema.safeParse({ workModel: 'anywhere' }).success).toBe(false);
    expect(jobListQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('accepts the empty paginated response', () => {
    const response = { data: [], pagination: {
      page: 1, pageSize: 25, totalItems: 0, totalPages: 0,
    } };
    expect(paginatedJobsSchema.parse(response)).toEqual(response);
  });

  it('rejects the legacy array response', () => {
    expect(paginatedJobsSchema.safeParse([]).success).toBe(false);
  });
});
