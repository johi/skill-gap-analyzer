import type { FastifyPluginAsync } from 'fastify';
import { jobAdvertisementRequestSchema } from '@/schemas/job-analysis';
import type { JobAnalysisService } from '@/services/job-analysis-service';

export function createJobAnalysisRoutes(
    service: JobAnalysisService
): FastifyPluginAsync {
    return async fastify => {
        fastify.post('/analyze', async request => {
            const { advertisement } = jobAdvertisementRequestSchema.parse(
                request.body
            );
            return service.analyze(advertisement);
        });
    };
}
