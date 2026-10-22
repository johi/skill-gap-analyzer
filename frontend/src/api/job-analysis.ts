import { apiRequest } from '@/api/client';
import {
    jobAdvertisementAnalysisSchema,
    type JobAdvertisementAnalysis,
} from '@/schemas/job-analysis';

export function analyzeJobAdvertisement(
    advertisement: string,
    sourceUrl?: string
): Promise<JobAdvertisementAnalysis> {
    return apiRequest(
        '/api/v1/job-analysis/analyze',
        jobAdvertisementAnalysisSchema,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ advertisement, ...(sourceUrl ? { sourceUrl } : {}) }),
        }
    );
}

export function analyzeJobAdvertisementUrl(url: string): Promise<JobAdvertisementAnalysis> {
    return apiRequest(
        '/api/v1/job-analysis/analyze-url',
        jobAdvertisementAnalysisSchema,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        }
    );
}
