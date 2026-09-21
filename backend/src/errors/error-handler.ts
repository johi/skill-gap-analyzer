import { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import {
    ConflictError,
    NotFoundError,
} from './application-errors';

export function registerErrorHandler(fastify: FastifyInstance): void {
    fastify.setErrorHandler(
        (
            error: FastifyError | ZodError | NotFoundError | ConflictError,
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

            request.log.error(error);

            return reply.status(500).send({
                error: 'internal_server_error',
                message: 'An unexpected error occurred',
            });
        }
    );
}