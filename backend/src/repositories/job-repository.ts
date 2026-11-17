import { desc, eq, inArray } from 'drizzle-orm';
import type { JobSkillRequirement } from '@/services/job-match-service';

import {
    jobs,
    jobContacts,
    jobLanguageRequirements,
    jobSkills,
    skills,
} from '@/db/schema';

import { DatabaseExecutor } from './types';

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export interface JobSkill {
    id: number;
    name: string;
    category: string;
    requirement: JobSkillRequirement;
}

export interface JobLanguageRequirement {
    language: string;
    requirement: string;
}

export type JobContact = typeof jobContacts.$inferSelect;

export interface JobWithSkills extends Job {
    contacts: JobContact[];
    skills: JobSkill[];
    languageRequirements: JobLanguageRequirement[];
}

function groupByJobId<T extends { jobId: number }>(rows: T[]): Map<number, T[]> {
    const grouped = new Map<number, T[]>();

    for (const row of rows) {
        const group = grouped.get(row.jobId);
        if (group) {
            group.push(row);
        } else {
            grouped.set(row.jobId, [row]);
        }
    }

    return grouped;
}

export class JobRepository {
    constructor(
        private readonly db: DatabaseExecutor
    ) {}

    private assembleJobs(
        selectedJobs: Job[],
        assignedSkills: Array<JobSkill & { jobId: number }>,
        contacts: JobContact[],
        languageRequirements: Array<JobLanguageRequirement & { jobId: number }>
    ): JobWithSkills[] {
        const skillsByJob = groupByJobId(assignedSkills);
        const contactsByJob = groupByJobId(contacts);
        const languagesByJob = groupByJobId(languageRequirements);

        return selectedJobs.map((job) => ({
            ...job,
            contacts: contactsByJob.get(job.id) ?? [],
            skills: (skillsByJob.get(job.id) ?? []).map(({ jobId: _, ...skill }) => skill),
            languageRequirements: (languagesByJob.get(job.id) ?? [])
                .map(({ jobId: _, ...requirement }) => requirement),
        }));
    }

    async findAll(): Promise<JobWithSkills[]> {
        const allJobs = await this.db
            .select()
            .from(jobs)
            .orderBy(desc(jobs.dateFound));

        if (allJobs.length === 0) {
            return [];
        }

        const assignedSkills = await this.db
            .select({
                jobId: jobSkills.jobId,
                id: skills.id,
                name: skills.name,
                category: skills.category,
                requirement: jobSkills.requirement,
            })
            .from(jobSkills)
            .innerJoin(
                skills,
                eq(jobSkills.skillId, skills.id)
            );

        const languageRequirements = await this.db
            .select({
                jobId: jobLanguageRequirements.jobId,
                language: jobLanguageRequirements.language,
                requirement: jobLanguageRequirements.requirement,
            })
            .from(jobLanguageRequirements);

        const contacts = await this.db.select().from(jobContacts);

        return this.assembleJobs(allJobs, assignedSkills as Array<JobSkill & { jobId: number }>, contacts, languageRequirements);
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

        const languageRequirements = await this.db
            .select({
                language: jobLanguageRequirements.language,
                requirement: jobLanguageRequirements.requirement,
            })
            .from(jobLanguageRequirements)
            .where(eq(jobLanguageRequirements.jobId, id));
        const contacts = await this.db
            .select()
            .from(jobContacts)
            .where(eq(jobContacts.jobId, id));

        return {
            ...job,
            contacts,
            skills: assignedSkills as JobSkill[],
            languageRequirements,
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

    async replaceContacts(
        jobId: number,
        contacts: Array<{
            name?: string | null;
            role?: string | null;
            email?: string | null;
            phone?: string | null;
        }>
    ): Promise<void> {
        await this.db.delete(jobContacts).where(eq(jobContacts.jobId, jobId));
        if (contacts.length === 0) return;

        await this.db.insert(jobContacts).values(
            contacts.map((contact) => ({
                jobId,
                name: contact.name ?? null,
                role: contact.role ?? null,
                email: contact.email ?? null,
                phone: contact.phone ?? null,
            }))
        );
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

    async replaceLanguageRequirements(
        jobId: number,
        requirements: Array<{
            language: string;
            requirement: 'preferred' | 'required';
        }>
    ): Promise<void> {
        await this.db
            .delete(jobLanguageRequirements)
            .where(eq(jobLanguageRequirements.jobId, jobId));

        if (requirements.length === 0) {
            return;
        }

        await this.db
            .insert(jobLanguageRequirements)
            .values(
                requirements.map((requirement) => ({
                    jobId,
                    language: requirement.language,
                    requirement: requirement.requirement,
                }))
            );
    }
}

