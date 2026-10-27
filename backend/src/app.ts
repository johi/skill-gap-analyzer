import Fastify, { FastifyServerOptions } from 'fastify';

import { db } from './db';

import { registerErrorHandler } from './errors/error-handler';

import { SkillRepository } from './repositories/skill-repository';
import { UserSkillRepository } from './repositories/user-skill-repository';
import { MarketAnalysisRepository } from './repositories/market-analysis-repository';

import { SkillService } from './services/skill-service';
import { UserSkillService } from './services/user-skill-service';
import { JobService } from './services/job-service';
import { JobImportService } from './services/job-import-service';
import { MarketAnalysisService } from './services/market-analysis-service';
import { JobAnalysisService } from './services/job-analysis-service';
import { SkillGapAnalysisService } from '@/services/skill-gap-analysis-service';
import { SkillPriorityService } from '@/services/skill-priority-service';
import { JobMatchService } from '@/services/job-match-service';
import { JobMatchAnalysisService } from '@/services/job-match-analysis-service';
import { JobComparisonService } from '@/services/job-comparison-service';

import { healthRoutes } from './routes/health';
import { createJobRoutes } from './routes/jobs';
import { createSkillRoutes } from './routes/skills';
import { createUserSkillRoutes } from './routes/user-skills';
import { createMarketAnalysisRoutes } from './routes/market-analysis';
import { createJobImportRoutes } from './routes/job-import';
import { createJobAnalysisRoutes } from './routes/job-analysis';

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

    const marketAnalysisRepository =
        new MarketAnalysisRepository(db);

    const skillService =
        new SkillService(skillRepository);

    const userSkillService =
        new UserSkillService(
            userSkillRepository,
            skillRepository
        );

    const marketAnalysisService =
        new MarketAnalysisService(marketAnalysisRepository);

    const skillGapAnalysisService =
        new SkillGapAnalysisService(
            marketAnalysisService,
            userSkillRepository
        );

    const skillPriorityService =
        new SkillPriorityService(skillGapAnalysisService);

    const jobService = new JobService();

    const jobMatchAnalysisService =
        new JobMatchAnalysisService(
            jobService,
            userSkillRepository,
            new JobMatchService()
        );

    const jobImportService =
        new JobImportService(skillRepository);

    fastify.register(
        createJobImportRoutes(jobImportService),
        {
            prefix: '/api/v1/job-import',
        }
    );

    const analysisProvider = new OpenAiJobAnalysisProvider();
    fastify.register(
        createJobAnalysisRoutes(
            new JobAnalysisService(analysisProvider, skillRepository),
            new JobAdvertisementUrlFetcher(undefined, undefined, analysisProvider)
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
        createJobRoutes(jobService, jobMatchAnalysisService, new JobComparisonService(userSkillRepository, new JobMatchService())),
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

    fastify.register(
        createMarketAnalysisRoutes(
            marketAnalysisService,
            skillGapAnalysisService,
            skillPriorityService
        ),
        {
            prefix: '/api/v1/analysis',
        }
    );

    return fastify;
}
