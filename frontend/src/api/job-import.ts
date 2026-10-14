import { apiRequest } from './client';

import {
    jobImportAnalysisSchema,
} from '@/schemas/job-import';

import type {
    JobDataset,
    JobImportAnalysis,
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
