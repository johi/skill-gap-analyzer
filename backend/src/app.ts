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
import { JobImportService } from './services/job-import-service';
import { createJobImportRoutes } from './routes/job-import';
import { createJobAnalysisRoutes } from './routes/job-analysis';
import { JobAnalysisService } from './services/job-analysis-service';
import { OpenAiJobAnalysisProvider } from './services/openai-job-analysis-provider';
import { JobAdvertisementUrlFetcher } from '@/services/job-advertisement-url-fetcher';

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

    const jobImportService =
        new JobImportService(skillRepository);

    fastify.register(
        createJobImportRoutes(jobImportService),
        {
            prefix: '/api/v1/job-import',
        }
    );
    
    fastify.register(
        createJobAnalysisRoutes(
            new JobAnalysisService(new OpenAiJobAnalysisProvider()),
            new JobAdvertisementUrlFetcher()
        ),
        { prefix: '/api/v1/job-analysis' }
    );

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