import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { ListJobsQuery } from '@/schemas/job';

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
    requirement: string;
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

export class JobRepository {
    constructor(
        private readonly db: DatabaseExecutor
    ) {}

    async findPage(query: ListJobsQuery): Promise<{
        data: JobWithSkills[];
        pagination: {
            page: number;
            pageSize: 10 | 25 | 50;
            totalItems: number;
            totalPages: number;
        };
    }> {
        const conditions = [];

        if (query.search) {
            const escaped = query.search.replace(/[\\%_]/g, '\\$&');
            const pattern = `%${escaped}%`;
            conditions.push(or(
                ilike(jobs.company, pattern),
                ilike(jobs.title, pattern),
                ilike(jobs.location, pattern),
            ));
        }
        if (query.workModel) conditions.push(eq(jobs.workModel, query.workModel));
        if (query.seniority) conditions.push(eq(jobs.seniority, query.seniority));
        if (query.employmentType) conditions.push(eq(jobs.employmentType, query.employmentType));
        if (query.applyStatus) conditions.push(eq(jobs.applyStatus, query.applyStatus));

        const where = and(...conditions);
        const [{ totalItems }] = await this.db
            .select({ totalItems: count() })
            .from(jobs)
            .where(where);

        const sortColumns = {
            dateFound: jobs.dateFound,
            company: jobs.company,
            interest: jobs.interest,
        };
        const column = sortColumns[query.sortBy === 'matchPercentage' ? 'dateFound' : query.sortBy];
        const ordering = query.sortOrder === 'asc'
            ? sql`${column} ASC NULLS LAST`
            : sql`${column} DESC NULLS LAST`;

        const pageJobs = await this.db
            .select()
            .from(jobs)
            .where(where)
            .orderBy(ordering, desc(jobs.id))
            .limit(query.pageSize)
            .offset((query.page - 1) * query.pageSize);

        const pagination = {
            page: query.page,
            pageSize: query.pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / query.pageSize),
        };

        if (pageJobs.length === 0) return { data: [], pagination };

        const ids = pageJobs.map((job) => job.id);
        const assignedSkills = await this.db
            .select({
                jobId: jobSkills.jobId,
                id: skills.id,
                name: skills.name,
                category: skills.category,
                requirement: jobSkills.requirement,
            })
            .from(jobSkills)
            .innerJoin(skills, eq(jobSkills.skillId, skills.id))
            .where(inArray(jobSkills.jobId, ids));

        const contacts = await this.db
            .select()
            .from(jobContacts)
            .where(inArray(jobContacts.jobId, ids));

        const languages = await this.db
            .select({
                jobId: jobLanguageRequirements.jobId,
                language: jobLanguageRequirements.language,
                requirement: jobLanguageRequirements.requirement,
            })
            .from(jobLanguageRequirements)
            .where(inArray(jobLanguageRequirements.jobId, ids));

        return {
            data: pageJobs.map((job) => ({
                ...job,
                contacts: contacts.filter((contact) => contact.jobId === job.id),
                skills: assignedSkills
                    .filter((skill) => skill.jobId === job.id)
                    .map(({ jobId: _, ...skill }) => skill),
                languageRequirements: languages
                    .filter((requirement) => requirement.jobId === job.id)
                    .map(({ jobId: _, ...requirement }) => requirement),
            })),
            pagination,
        };
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

        return allJobs.map((job) => ({
            ...job,
            contacts: contacts.filter((contact) => contact.jobId === job.id),

            skills: assignedSkills
                .filter((skill) => skill.jobId === job.id)
                .map(({ jobId: _, ...skill }) => skill),

            languageRequirements: languageRequirements
                .filter((requirement) => requirement.jobId === job.id)
                .map(({ jobId: _, ...requirement }) => requirement),
        }));
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
            skills: assignedSkills,
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
