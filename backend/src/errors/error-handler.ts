import { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export function registerErrorHandler(fastify: FastifyInstance): void {
    fastify.setErrorHandler((error: FastifyError | ZodError, request, reply) => {
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

        request.log.error(error);

        return reply.status(500).send({
            error: 'internal_server_error',
            message: 'An unexpected error occurred',
        });
    });
}