
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { JobService } from '@/services/job-service';
import type { JobMatchAnalysisService } from '@/services/job-match-analysis-service';
import { idParamSchema } from '@/schemas/common';
import {
    createJobSchema,
    updateJobSchema,
    jobResponseSchema,
    jobsResponseSchema,
    listJobsQuerySchema,
} from '@/schemas/job';

import { JobImportCommitService } from '@/services/job-import-commit-service';
import {
    jobDatasetSchema,
    reviewedImportSchema,
} from '@/schemas/job-dataset';

export function createJobRoutes(
    jobService: JobService,
    jobMatchAnalysisService: JobMatchAnalysisService
): FastifyPluginAsync {
    return async (fastify) => {
        const importCommitService = new JobImportCommitService();

        fastify.post('/import/commit', async (request, reply) => {
            const body = z.object({
                dataset: z.unknown(),
                reviewedImport: z.unknown(),
                replaceExisting: z.boolean().optional().default(false),
            }).parse(request.body);

            const dataset = jobDatasetSchema.parse(body.dataset);
            const reviewedImport = reviewedImportSchema.parse(
                body.reviewedImport
            );

            const result = await importCommitService.commit(
                dataset,
                reviewedImport,
                body.replaceExisting
            );

            return reply.status(201).send(result);
        });

        fastify.get('/', async (request) => {
            const query = listJobsQuerySchema.parse(request.query);
            const jobs = await jobService.list(query);

            return jobsResponseSchema.parse(jobs);
        });

        fastify.get('/:id/match', async (request) => {
            const { id } = idParamSchema.parse(
                request.params
            );

            return jobMatchAnalysisService.getJobMatch(id);
        });

        fastify.get('/:id', async (request) => {
            const { id } = idParamSchema.parse(
                request.params
            );

            const job = await jobService.get(id);

            return jobResponseSchema.parse(job);
        });

        fastify.post('/', async (request, reply) => {
            const input = createJobSchema.parse(
                request.body
            );

            const job = await jobService.create(input);

            return reply.status(201).send(job);
        });

        fastify.put('/:id', async (request) => {
            const { id } = idParamSchema.parse(
                request.params
            );

            const input = updateJobSchema.parse(
                request.body
            );

            return jobService.update(id, input);
        });

        fastify.delete('/:id', async (request, reply) => {
            const { id } = idParamSchema.parse(
                request.params
            );

            await jobService.delete(id);

            return reply.status(204).send();
        });
    };
}
