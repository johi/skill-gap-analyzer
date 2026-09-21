import Fastify, { FastifyServerOptions } from 'fastify';

import { db } from './db';

import { registerErrorHandler } from './errors/error-handler';

import { SkillRepository } from './repositories/skill-repository';
import { UserSkillRepository } from './repositories/user-skill-repository';

import { SkillService } from './services/skill-service';
import { UserSkillService } from './services/user-skill-service';
import { JobService } from './services/job-service';

import { healthRoutes } from './routes/health';
import { createJobRoutes } from './routes/jobs';
import { createSkillRoutes } from './routes/skills';
import { createUserSkillRoutes } from './routes/user-skills';

export function buildApp(
    options: FastifyServerOptions = {
        logger: false,
    }
) {
    const fastify = Fastify(options);

    registerErrorHandler(fastify);

    const skillRepository =
        new SkillRepository(db);

    const userSkillRepository =
        new UserSkillRepository(db);

    const skillService =
        new SkillService(skillRepository);

    const userSkillService =
        new UserSkillService(
            userSkillRepository,
            skillRepository
        );

    const jobService = new JobService();

    fastify.register(
        healthRoutes,
        {
            prefix: '/api/v1/health',
        }
    );

    fastify.register(
        createJobRoutes(jobService),
        {
            prefix: '/api/v1/jobs',
        }
    );

    fastify.register(
        createSkillRoutes(skillService),
        {
            prefix: '/api/v1/skills',
        }
    );

    fastify.register(
        createUserSkillRoutes(userSkillService),
        {
            prefix: '/api/v1/user-skills',
        }
    );

    return fastify;
}