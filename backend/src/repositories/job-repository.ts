import { desc, eq } from 'drizzle-orm';

import { db } from '../db';
import {
    jobs,
    jobSkills,
    skills,
} from '../db/schema';

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export interface JobSkill {
    id: number;
    name: string;
    category: string;
    requirement: string;
}

export interface JobWithSkills extends Job {
    skills: JobSkill[];
}

export class JobRepository {
    async findAll(): Promise<Job[]> {
        return db
            .select()
            .from(jobs)
            .orderBy(desc(jobs.dateFound));
    }

    async findById(id: number): Promise<JobWithSkills | undefined> {
        const [job] = await db
            .select()
            .from(jobs)
            .where(eq(jobs.id, id))
            .limit(1);

        if (!job) {
            return undefined;
        }

        const assignedSkills = await db
            .select({
                id: skills.id,
                name: skills.name,
                category: skills.category,
                requirement: jobSkills.requirement,
            })
            .from(jobSkills)
            .innerJoin(
                skills,
                eq(jobSkills.skillId, skills.id)
            )
            .where(eq(jobSkills.jobId, id));

        return {
            ...job,
            skills: assignedSkills,
        };
    }

    async create(data: NewJob): Promise<Job> {
        const [job] = await db
            .insert(jobs)
            .values(data)
            .returning();

        return job;
    }

    async update(
        id: number,
        data: Partial<NewJob>
    ): Promise<Job | undefined> {
        const [job] = await db
            .update(jobs)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(jobs.id, id))
            .returning();

        return job;
    }

    async delete(id: number): Promise<boolean> {
        const deleted = await db
            .delete(jobs)
            .where(eq(jobs.id, id))
            .returning({
                id: jobs.id,
            });

        return deleted.length > 0;
    }
}

export const jobRepository = new JobRepository();