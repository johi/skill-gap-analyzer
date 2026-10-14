import { apiRequest } from './client';
import { jobWithSkillsSchema } from '@/schemas/job';
import {
  jobListQuerySchema,
  paginatedJobsSchema,
} from '@/schemas/job-list';
import type { JobListQuery, PaginatedJobs } from '@/schemas/job-list';
import type { CreateJobInput, JobWithSkills } from '@/types/job';

export function getJobs(query: Partial<JobListQuery> = {}): Promise<PaginatedJobs> {
  const filters = jobListQuerySchema.parse(query);
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.workModel) params.set('workModel', filters.workModel);
  if (filters.seniority) params.set('seniority', filters.seniority);
  if (filters.employmentType) params.set('employmentType', filters.employmentType);
  if (filters.applyStatus) params.set('applyStatus', filters.applyStatus);
  params.set('sortBy', filters.sortBy);
  params.set('sortOrder', filters.sortOrder);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  return apiRequest(`/api/v1/jobs?${params.toString()}`, paginatedJobsSchema);
}

export function getJob(id: number): Promise<JobWithSkills> {
  return apiRequest(`/api/v1/jobs/${id}`, jobWithSkillsSchema);
}

export function createJob(input: CreateJobInput): Promise<JobWithSkills> {
  return apiRequest('/api/v1/jobs', jobWithSkillsSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateJob(id: number, input: CreateJobInput): Promise<JobWithSkills> {
  return apiRequest(`/api/v1/jobs/${id}`, jobWithSkillsSchema, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function deleteJob(id: number): Promise<void> {
  return apiRequest<void>(`/api/v1/jobs/${id}`, null, { method: 'DELETE' });
}
