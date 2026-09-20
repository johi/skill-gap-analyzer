import { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';

import { db } from '../db';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', async () => {
        await db.execute(sql`SELECT 1`);

        return {
            status: 'ok',
            database: 'connected',
        };
    });
};