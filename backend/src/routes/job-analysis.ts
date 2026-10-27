import type { FastifyPluginAsync } from 'fastify';
import { jobAdvertisementRequestSchema, jobUrlAnalysisRequestSchema } from '@/schemas/job-analysis';
import type { JobAdvertisementUrlFetcher } from '@/services/job-advertisement-url-fetcher';
import type { JobAnalysisService } from '@/services/job-analysis-service';

export function createJobAnalysisRoutes(
    service: JobAnalysisService,
    urlFetcher?: JobAdvertisementUrlFetcher
): FastifyPluginAsync {
    return async fastify => {
        fastify.post('/analyze', async request => {
            const { advertisement, sourceUrl } = jobAdvertisementRequestSchema.parse(
                request.body
            );
            return service.analyze(advertisement, sourceUrl ?? null);
        });

        if (urlFetcher) {
            fastify.post('/analyze-url', async request => {
                const { url } = jobUrlAnalysisRequestSchema.parse(request.body);
                const { advertisement, sourceUrl, title, metadataContext } = await urlFetcher.retrieve(url);
                return service.analyze(advertisement, sourceUrl, title ?? null, metadataContext ?? null);
            });
        }
    };
}
