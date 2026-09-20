import Fastify from 'fastify';

import { registerErrorHandler } from './errors/error-handler';
import { healthRoutes } from './routes/health';
import { jobRoutes } from './routes/jobs';
import { skillRoutes } from './routes/skills';
import { userSkillRoutes } from './routes/user-skills';

const fastify = Fastify({
    logger: true,
});

registerErrorHandler(fastify);

fastify.register(healthRoutes, {
    prefix: '/api/v1/health',
});

fastify.register(jobRoutes, {
    prefix: '/api/v1/jobs',
});

fastify.register(skillRoutes, {
    prefix: '/api/v1/skills',
});

fastify.register(userSkillRoutes, {
    prefix: '/api/v1/user-skills',
});

const start = async () => {
    try {
        await fastify.listen({
            port: 3000,
            host: '0.0.0.0',
        });
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
};

start();