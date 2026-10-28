import { listPaginationSchema, validateSort } from '@/schemas/list-pagination';
import { FastifyPluginAsync } from 'fastify';

import { UserSkillService } from '../services/user-skill-service';
import { skillIdParamSchema } from '../schemas/common';
import { userSkillSchema } from '../schemas/user-skill';

export function createUserSkillRoutes(
    userSkillService: UserSkillService
): FastifyPluginAsync {
    return async (fastify) => {
        fastify.get('/', async () => {
            return userSkillService.list();
        });

        fastify.get('/catalogue', async (request) => {
            const query = listPaginationSchema.parse(request.query);
            validateSort(query.sortBy, ['name', 'category', 'level']);
            return userSkillService.listCataloguePage(query);
        });

        fastify.get('/:skillId', async (request) => {
            const { skillId } = skillIdParamSchema.parse(
                request.params
            );

            return userSkillService.get(skillId);
        });

        fastify.put(
            '/:skillId',
            async (request) => {
                const { skillId } =
                    skillIdParamSchema.parse(
                        request.params
                    );

                const { level } =
                    userSkillSchema.parse(
                        request.body
                    );

                return userSkillService.setLevel(
                    skillId,
                    level
                );
            }
        );

        fastify.delete(
            '/:skillId',
            async (request, reply) => {
                const { skillId } =
                    skillIdParamSchema.parse(
                        request.params
                    );

                await userSkillService.delete(skillId);

                return reply.status(204).send();
            }
        );
    };
}