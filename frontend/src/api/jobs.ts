import { apiRequest } from './client';

import type {
    Job,
    JobWithSkills,
} from '../types/job';

export function getJobs(): Promise<Job[]> {
    return apiRequest<Job[]>('/api/v1/jobs');
}

export function getJob(id: number): Promise<JobWithSkills> {
    return apiRequest<JobWithSkills>(
        `/api/v1/jobs/${id}`
    );
}