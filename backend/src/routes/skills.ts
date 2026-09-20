import { FastifyPluginAsync } from 'fastify';

import { idParamSchema } from '../schemas/common';
import {
    createSkillSchema,
    updateSkillSchema,
} from '../schemas/skill';

export const skillRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async () => {
        return {
            message: 'List skills',
        };
    });

    fastify.get('/:id', async (request) => {
        const params = idParamSchema.parse(request.params);

        return {
            message: 'Get skill',
            id: params.id,
        };
    });

    fastify.post('/', async (request, reply) => {
        const input = createSkillSchema.parse(request.body);

        return reply.code(201).send({
            message: 'Create skill',
            input,
        });
    });

    fastify.put('/:id', async (request) => {
        const params = idParamSchema.parse(request.params);
        const input = updateSkillSchema.parse(request.body);

        return {
            message: 'Update skill',
            id: params.id,
            input,
        };
    });

    fastify.delete('/:id', async (request) => {
        const params = idParamSchema.parse(request.params);

        return {
            message: 'Delete skill',
            id: params.id,
        };
    });
};