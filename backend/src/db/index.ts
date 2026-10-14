
import 'dotenv/config';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
}

const url = new URL(databaseUrl);

const isTestProcess =
    process.env.VITEST === 'true' ||
    process.env.NODE_ENV === 'test';

if (isTestProcess) {
    if (
        url.hostname !== 'db-test' ||
        url.pathname !== '/app_test'
    ) {
        throw new Error(
            'Test process refused to connect to a non-test database'
        );
    }
}

const pool = new Pool({
    connectionString: databaseUrl,
});

export const db = drizzle(pool, {
    schema,
});
