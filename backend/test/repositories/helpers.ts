import { sql } from 'drizzle-orm';

import { db } from '../../src/db';

export async function cleanDatabase(): Promise<void> {
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