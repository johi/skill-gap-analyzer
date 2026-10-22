import { apiRequest } from './client';
import {
    jobAdvertisementAnalysisSchema,
    type JobAdvertisementAnalysis,
} from '@/schemas/job-analysis';

export function analyzeJobAdvertisement(
    advertisement: string
): Promise<JobAdvertisementAnalysis> {
    return apiRequest(
        '/api/v1/job-analysis/analyze',
        jobAdvertisementAnalysisSchema,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ advertisement }),
        }
    );
}
