import { FastifyPluginAsync } from 'fastify';

import { JobImportService } from '@/services/job-import-service';
import {
    jobDatasetSchema,
    jobImportAnalysisSchema,
} from '@/schemas/job-dataset';

export function createJobImportRoutes(
    jobImportService: JobImportService
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.post('/analyze', async (request) => {
            const dataset = jobDatasetSchema.parse(
                request.body
            );

            const analysis =
                await jobImportService.analyze(dataset);

            return jobImportAnalysisSchema.parse(
                analysis
            );
        });
    };
}