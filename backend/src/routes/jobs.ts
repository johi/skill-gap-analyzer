import { FastifyPluginAsync } from 'fastify';

export const jobRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async () => {
        return {
            message: 'List jobs',
        };
    });

    fastify.get('/:id', async (request) => {
        return {
            message: 'Get job',
        };
    });

    fastify.post('/', async (request) => {
        return {
            message: 'Create job',
        };
    });

    fastify.put('/:id', async (request) => {
        return {
            message: 'Update job',
        };
    });

    fastify.delete('/:id', async (request) => {
        return {
            message: 'Delete job',
        };
    });
};