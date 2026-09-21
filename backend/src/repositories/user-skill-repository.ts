import { asc, eq } from 'drizzle-orm';

import { skills, userSkills } from '../db/schema';
import { DatabaseExecutor } from './types';

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
        level: number
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