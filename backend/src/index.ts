import Fastify from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from './db';

const fastify = Fastify({
    logger: true,
});

fastify.get('/', async () => {
    await db.execute(sql`SELECT 1`);

    return {
        message: 'Backend is running',
        database: 'connected',
    };
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
