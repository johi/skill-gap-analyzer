import { sql } from 'drizzle-orm';

import { db } from '@/db';

export async function cleanDatabase(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured');
    }

    const url = new URL(databaseUrl);

    if (
        url.hostname !== 'db-test' ||
        url.pathname !== '/app_test'
    ) {
        throw new Error(
            `Refusing to clean a non-test database: ${url.hostname}${url.pathname}`
        );
    }

    const connection = await db.execute(sql`
        SELECT current_database() AS database_name,
               inet_server_addr()::text AS server_address
    `);

    if (connection.rows[0]?.database_name !== 'app_test') {
        throw new Error(
            'Refusing to clean database: connected database is not app_test'
        );
    }

    await db.execute(sql`
        TRUNCATE TABLE
            job_skills,
            user_skills,
            jobs,
            skills
        RESTART IDENTITY
        CASCADE
    `);
}