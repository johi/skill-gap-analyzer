
import { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';

import {
    JobAnalysisInvalidResponseError,
    JobAnalysisUnavailableError,
} from './job-analysis-errors';

import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from './application-errors';

export function registerErrorHandler(fastify: FastifyInstance): void {
    fastify.setErrorHandler(
        (
            error:
                | FastifyError
                | ZodError
                | NotFoundError
                | ConflictError
                | ValidationError
                | JobAnalysisInvalidResponseError
                | JobAnalysisUnavailableError
                | JobAdvertisementRetrievalError,
            request,
            reply
        ) => {
            if (error instanceof ZodError) {
                return reply.status(400).send({
                    error: 'validation_error',
                    message: 'Request validation failed',
                    issues: error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                        code: issue.code,
                    })),
                });
            }

            if (error instanceof ValidationError) {
                return reply.status(400).send({
                    error: 'validation_error',
                    message: error.message,
                });
            }

            if (error instanceof NotFoundError) {
                return reply.status(404).send({
                    error: 'not_found',
                    message: error.message,
                });
            }

            if (error instanceof ConflictError) {
                return reply.status(409).send({
                    error: 'conflict',
                    message: error.message,
                });
            }

            if (error instanceof JobAdvertisementRetrievalError) {
                return reply.status(error.statusCode).send({
                    error: error.code,
                    message: error.message,
                });
            }

            if (error instanceof JobAnalysisUnavailableError) {
                request.log.warn({ errorName: error.name }, 'AI provider unavailable');
                return reply.status(503).send({
                    error: 'ai_service_unavailable',
                    message: error.message,
                });
            }

            if (error instanceof JobAnalysisInvalidResponseError) {
                request.log.warn('AI provider returned invalid analysis');
                return reply.status(502).send({
                    error: 'ai_invalid_response',
                    message: error.message,
                });
            }

            request.log.error(error);

            return reply.status(500).send({
                error: 'internal_server_error',
                message: 'An unexpected error occurred',
            });
        }
    );
}
