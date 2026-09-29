import { apiRequest } from './client';

import type { Job } from '../types/job';

export function getJobs(): Promise<Job[]> {
    return apiRequest<Job[]>('/api/v1/jobs');
}