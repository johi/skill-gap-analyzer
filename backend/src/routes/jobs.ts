import { FastifyPluginAsync } from 'fastify';

import { idParamSchema } from '../schemas/common';
import {
    createJobSchema,
    updateJobSchema,
} from '../schemas/job';

export const jobRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async () => {
        return {
            message: 'List jobs',
        };
    });

    fastify.get('/:id', async (request) => {
        const params = idParamSchema.parse(request.params);

        return {
            message: 'Get job',
            id: params.id,
        };
    });

    fastify.post('/', async (request, reply) => {
        const input = createJobSchema.parse(request.body);

        return reply.code(201).send({
            message: 'Create job',
            input,
        });
    });

    fastify.put('/:id', async (request) => {
        const params = idParamSchema.parse(request.params);
        const input = updateJobSchema.parse(request.body);

        return {
            message: 'Update job',
            id: params.id,
            input,
        };
    });

    fastify.delete('/:id', async (request) => {
        const params = idParamSchema.parse(request.params);

        return {
            message: 'Delete job',
            id: params.id,
        };
    });
};