import { FastifyPluginAsync } from 'fastify';

export const skillRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async () => {
        return {
            message: 'List skills',
        };
    });

    fastify.get('/:id', async () => {
        return {
            message: 'Get skill',
        };
    });

    fastify.post('/', async () => {
        return {
            message: 'Create skill',
        };
    });

    fastify.put('/:id', async () => {
        return {
            message: 'Update skill',
        };
    });

    fastify.delete('/:id', async () => {
        return {
            message: 'Delete skill',
        };
    });
};