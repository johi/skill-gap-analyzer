import { asc, desc, eq, ilike, count } from 'drizzle-orm';

import { skills, userSkills } from '@/db/schema';
import { DatabaseExecutor } from './types';
import type { SkillLevel } from '@/schemas/user-skill';

export type UserSkill = typeof userSkills.$inferSelect;
export type NewUserSkill = typeof userSkills.$inferInsert;

export class UserSkillRepository {
    constructor(
        private readonly db: DatabaseExecutor
    ) {}

    async findAll() {
        return this.db
            .select({
                skillId: userSkills.skillId,
                name: skills.name,
                category: skills.category,
                level: userSkills.level,
                updatedAt: userSkills.updatedAt,
            })
            .from(userSkills)
            .innerJoin(
                skills,
                eq(userSkills.skillId, skills.id)
            )
            .orderBy(asc(skills.name));
    }

    async findCataloguePage(query: import('@/schemas/list-pagination').ListPaginationQuery) {
        const pattern = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
        const filter = query.search ? ilike(skills.name, pattern) : undefined;
        const [{ totalItems }] = await this.db.select({ totalItems: count() }).from(skills).where(filter);
        const { pagination } = await import('@/schemas/list-pagination');
        const meta = pagination(query.page, query.pageSize, totalItems);
        const column = query.sortBy === 'category' ? skills.category
            : query.sortBy === 'level' ? userSkills.level : skills.name;
        const order = query.sortOrder === 'desc' ? desc(column) : asc(column);
        const data = await this.db.select({
            id: skills.id, name: skills.name, category: skills.category, level: userSkills.level,
        }).from(skills).leftJoin(userSkills, eq(skills.id, userSkills.skillId))
            .where(filter).orderBy(order, asc(skills.name), asc(skills.id))
            .limit(meta.pageSize).offset((meta.page - 1) * meta.pageSize);
        return { data, pagination: meta };
    }

    async findBySkillId(
        skillId: number
    ): Promise<UserSkill | undefined> {
        const [userSkill] = await this.db
            .select()
            .from(userSkills)
            .where(eq(userSkills.skillId, skillId))
            .limit(1);

        return userSkill;
    }

    async upsert(
        skillId: number,
        level: SkillLevel
    ): Promise<UserSkill> {
        const [userSkill] = await this.db
            .insert(userSkills)
            .values({
                skillId,
                level,
            })
            .onConflictDoUpdate({
                target: userSkills.skillId,
                set: {
                    level,
                    updatedAt: new Date(),
                },
            })
            .returning();

        return userSkill;
    }

    async delete(skillId: number): Promise<boolean> {
        const deleted = await this.db
            .delete(userSkills)
            .where(eq(userSkills.skillId, skillId))
            .returning({
                skillId: userSkills.skillId,
            });

        return deleted.length > 0;
    }
}