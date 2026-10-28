import { and, asc, desc, eq, ilike, inArray, count } from 'drizzle-orm';

import { jobSkills, skills } from '../db/schema';
import { NotFoundError } from '@/errors/application-errors';
import { DatabaseExecutor } from './types';

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

export class SkillRepository {
    constructor(
        private readonly db: DatabaseExecutor
    ) {}

    async findAll(): Promise<Skill[]> {
        return this.db
            .select()
            .from(skills)
            .orderBy(asc(skills.name));
    }

    async findPage(query: import('@/schemas/list-pagination').ListPaginationQuery) {
        const pattern = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
        const filter = query.search ? ilike(skills.name, pattern) : undefined;
        const [{ totalItems }] = await this.db.select({ totalItems: count() }).from(skills).where(filter);
        const { pagination } = await import('@/schemas/list-pagination');
        const meta = pagination(query.page, query.pageSize, totalItems);
        const column = query.sortBy === 'category' ? skills.category : skills.name;
        const ordering = query.sortOrder === 'desc' ? desc(column) : asc(column);
        const data = await this.db.select().from(skills).where(filter)
            .orderBy(ordering, asc(skills.name), asc(skills.id))
            .limit(meta.pageSize).offset((meta.page - 1) * meta.pageSize);
        return { data, pagination: meta };
    }

    async findById(id: number): Promise<Skill | undefined> {
        const [skill] = await this.db
            .select()
            .from(skills)
            .where(eq(skills.id, id))
            .limit(1);

        return skill;
    }

    async findByName(name: string): Promise<Skill | undefined> {
        const [skill] = await this.db
            .select()
            .from(skills)
            .where(ilike(skills.name, name))
            .limit(1);

        return skill;
    }

    async create(data: NewSkill): Promise<Skill> {
        const [skill] = await this.db
            .insert(skills)
            .values(data)
            .returning();

        return skill;
    }

    async update(
        id: number,
        data: Partial<NewSkill>
    ): Promise<Skill | undefined> {
        const [skill] = await this.db
            .update(skills)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(skills.id, id))
            .returning();

        return skill;
    }


    async merge(sourceIds: number[], targetId: number): Promise<void> {
        // DatabaseExecutor is shared with transaction-scoped repositories; a
        // merge specifically requires the root Drizzle executor.
        const database = this.db as DatabaseExecutor & {
            transaction<T>(callback: (tx: DatabaseExecutor) => Promise<T>): Promise<T>;
        };

        await database.transaction(async (tx) => {
            const ids = [...sourceIds, targetId];
            const existing = await tx.select({ id: skills.id })
                .from(skills)
                .where(inArray(skills.id, ids));

            if (existing.length !== ids.length) {
                throw new NotFoundError('One or more skills were not found');
            }

            for (const sourceId of sourceIds) {
                // An existing target association takes precedence. Discard
                // the source association rather than changing its requirement.
                const targetJobs = tx.select({ jobId: jobSkills.jobId })
                    .from(jobSkills)
                    .where(eq(jobSkills.skillId, targetId));

                await tx.delete(jobSkills).where(and(
                    eq(jobSkills.skillId, sourceId),
                    inArray(jobSkills.jobId, targetJobs)
                ));

                await tx.update(jobSkills)
                    .set({ skillId: targetId })
                    .where(eq(jobSkills.skillId, sourceId));
            }

            // ON DELETE CASCADE removes source proficiency assessments.
            await tx.delete(skills).where(inArray(skills.id, sourceIds));
        });
    }

    async delete(id: number): Promise<boolean> {
        const deleted = await this.db
            .delete(skills)
            .where(eq(skills.id, id))
            .returning({
                id: skills.id,
            });

        return deleted.length > 0;
    }
}
