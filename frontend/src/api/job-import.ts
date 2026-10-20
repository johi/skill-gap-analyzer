
import { apiRequest } from './client';

import {
    jobImportAnalysisSchema,
    jobImportCommitResponseSchema,
} from '@/schemas/job-import';

import type {
    JobDataset,
    JobImportAnalysis,
    JobImportCommitResponse,
    ReviewedImport,
} from '@/schemas/job-import';

export function analyzeJobImport(
    dataset: JobDataset
): Promise<JobImportAnalysis> {
    return apiRequest(
        '/api/v1/job-import/analyze',
        jobImportAnalysisSchema,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataset),
        }
    );
}

export function commitJobImport(
    dataset: JobDataset,
    reviewedImport: ReviewedImport,
    replaceExisting = false
): Promise<JobImportCommitResponse> {
    return apiRequest(
        '/api/v1/jobs/import/commit',
        jobImportCommitResponseSchema,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dataset,
                reviewedImport,
                replaceExisting,
            }),
        }
    );
}
