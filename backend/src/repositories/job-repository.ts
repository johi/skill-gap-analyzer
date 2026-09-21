import { desc, eq } from 'drizzle-orm';

import {
    jobs,
    jobSkills,
    skills,
} from '../db/schema';
import { DatabaseExecutor } from './types';

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
    constructor(
        private readonly db: DatabaseExecutor
    ) {}

    async findAll(): Promise<Job[]> {
        return this.db
            .select()
            .from(jobs)
            .orderBy(desc(jobs.dateFound));
    }

    async findById(id: number): Promise<JobWithSkills | undefined> {
        const [job] = await this.db
            .select()
            .from(jobs)
            .where(eq(jobs.id, id))
            .limit(1);

        if (!job) {
            return undefined;
        }

        const assignedSkills = await this.db
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
        const [job] = await this.db
            .insert(jobs)
            .values(data)
            .returning();

        return job;
    }

    async update(
        id: number,
        data: Partial<NewJob>
    ): Promise<Job | undefined> {
        const [job] = await this.db
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
        const deleted = await this.db
            .delete(jobs)
            .where(eq(jobs.id, id))
            .returning({
                id: jobs.id,
            });

        return deleted.length > 0;
    }

    async replaceSkills(
        jobId: number,
        assignedSkills: Array<{
            skillId: number;
            requirement: 'must_have' | 'nice_to_have';
        }>
    ): Promise<void> {
        await this.db
            .delete(jobSkills)
            .where(eq(jobSkills.jobId, jobId));

        if (assignedSkills.length === 0) {
            return;
        }

        await this.db
            .insert(jobSkills)
            .values(
                assignedSkills.map((skill) => ({
                    jobId,
                    skillId: skill.skillId,
                    requirement: skill.requirement,
                }))
            );
    }
}