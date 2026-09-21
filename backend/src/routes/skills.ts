import { FastifyPluginAsync } from 'fastify';

import { SkillService } from '../services/skill-service';
import { idParamSchema } from '../schemas/common';
import {
    createSkillSchema,
    updateSkillSchema,
} from '../schemas/skill';

export function createSkillRoutes(
    skillService: SkillService
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.get('/', async () => {
            return skillService.list();
        });

        fastify.get('/:id', async (request) => {
            const { id } = idParamSchema.parse(
                request.params
            );

            return skillService.get(id);
        });

        fastify.post('/', async (request, reply) => {
            const input = createSkillSchema.parse(
                request.body
            );

            const skill =
                await skillService.create(input);

            return reply.status(201).send(skill);
        });

        fastify.put('/:id', async (request) => {
            const { id } = idParamSchema.parse(
                request.params
            );

            const input = updateSkillSchema.parse(
                request.body
            );

            return skillService.update(id, input);
        });

        fastify.delete('/:id', async (request, reply) => {
            const { id } = idParamSchema.parse(
                request.params
            );

            await skillService.delete(id);

            return reply.status(204).send();
        });
    };
}