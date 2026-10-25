
import { apiRequest } from '@/api/client';
import { jobMatchResultSchema } from '@/schemas/job-match';
import type { JobMatchResult } from '@/schemas/job-match';

export function getJobMatch(jobId: number): Promise<JobMatchResult> {
    return apiRequest(
        `/api/v1/jobs/${jobId}/match`,
        jobMatchResultSchema
    );
}
