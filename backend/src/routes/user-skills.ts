import { FastifyPluginAsync } from 'fastify';

import { skillIdParamSchema } from '../schemas/common';
import { userSkillSchema } from '../schemas/user-skill';

export const userSkillRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async () => {
        return {
            message: 'List user skills',
        };
    });

    fastify.get('/:skillId', async (request) => {
        const params = skillIdParamSchema.parse(request.params);

        return {
            message: 'Get user skill',
            skillId: params.skillId,
        };
    });

    fastify.put('/:skillId', async (request) => {
        const params = skillIdParamSchema.parse(request.params);
        const input = userSkillSchema.parse(request.body);

        return {
            message: 'Set user skill',
            skillId: params.skillId,
            input,
        };
    });

    fastify.delete('/:skillId', async (request) => {
        const params = skillIdParamSchema.parse(request.params);

        return {
            message: 'Delete user skill',
            skillId: params.skillId,
        };
    });
};