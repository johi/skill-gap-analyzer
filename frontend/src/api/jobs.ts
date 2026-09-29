import { apiRequest } from './client';

import type {
    CreateJobInput,
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

export function createJob(
    input: CreateJobInput
): Promise<JobWithSkills> {
    return apiRequest<JobWithSkills>(
        '/api/v1/jobs',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        }
    );
}