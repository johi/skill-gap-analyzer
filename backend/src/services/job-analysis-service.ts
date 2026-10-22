import {
    extractedJobSchema,
    jobAdvertisementAnalysisSchema,
    type JobAdvertisementAnalysis,
} from '@/schemas/job-analysis';
import { JobAnalysisInvalidResponseError } from '@/errors/job-analysis-errors';
import type { JobAnalysisProvider } from '@/services/job-analysis-contract';

export class JobAnalysisService {
    constructor(private readonly provider: JobAnalysisProvider) {}

    async analyze(advertisement: string, sourceUrl: string | null = null): Promise<JobAdvertisementAnalysis> {
        const result = extractedJobSchema.safeParse(
            await this.provider.analyze(advertisement)
        );

        if (!result.success) {
            throw new JobAnalysisInvalidResponseError();
        }

        const proposal = result.data;

        return jobAdvertisementAnalysisSchema.parse({
            dateFound: new Date().toISOString().slice(0, 10),
            originalText: advertisement,
            sourceUrl,
            proposal,
            requiresReview:
                proposal.company === null ||
                proposal.title === null ||
                proposal.skills.some(skill =>
                    skill.category === null || skill.requirement === null
                ),
        });
    }
}
