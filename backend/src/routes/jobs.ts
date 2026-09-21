import { FastifyPluginAsync } from 'fastify';

import { JobService } from '../services/job-service';
import { idParamSchema } from '../schemas/common';
import {
    createJobSchema,
    updateJobSchema,
} from '../schemas/job';

export function createJobRoutes(
    jobService: JobService
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.get('/', async () => {
            return jobService.list();
        });

        fastify.get('/:id', async (request) => {
            const { id } = idParamSchema.parse(
                request.params
            );

            return jobService.get(id);
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