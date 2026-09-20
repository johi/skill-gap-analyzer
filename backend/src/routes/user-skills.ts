import { FastifyPluginAsync } from 'fastify';

export const userSkillRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async () => {
        return {
            message: 'List user skills',
        };
    });

    fastify.get('/:skillId', async () => {
        return {
            message: 'Get user skill',
        };
    });

    fastify.put('/:skillId', async () => {
        return {
            message: 'Set user skill',
        };
    });

    fastify.delete('/:skillId', async () => {
        return {
            message: 'Delete user skill',
        };
    });
};