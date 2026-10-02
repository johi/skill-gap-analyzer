import { apiRequest } from './client';
import {
    jobsSchema,
    jobWithSkillsSchema,
} from '@/schemas/job';

import type {
    CreateJobInput,
    Job,
    JobWithSkills,
} from '@/types/job';

export function getJobs(): Promise<Job[]> {
    return apiRequest(
        '/api/v1/jobs',
        jobsSchema
    );
}

export function getJob(id: number): Promise<JobWithSkills> {
    return apiRequest(
        `/api/v1/jobs/${id}`,
        jobWithSkillsSchema
    );
}

export function createJob(
    input: CreateJobInput
): Promise<JobWithSkills> {
    return apiRequest(
        '/api/v1/jobs',
        jobWithSkillsSchema,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        }
    );
}

export function updateJob(
    id: number,
    input: CreateJobInput
): Promise<JobWithSkills> {
    return apiRequest(
        `/api/v1/jobs/${id}`,
        jobWithSkillsSchema,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        }
    );
}

export function deleteJob(id: number): Promise<void> {
    return apiRequest<void>(
        `/api/v1/jobs/${id}`,
        null,
        {
            method: 'DELETE',
        }
    );
}