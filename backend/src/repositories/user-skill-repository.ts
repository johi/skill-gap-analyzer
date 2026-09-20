import { asc, eq } from 'drizzle-orm';

import { db } from '../db';
import { skills, userSkills } from '../db/schema';

export type UserSkill = typeof userSkills.$inferSelect;
export type NewUserSkill = typeof userSkills.$inferInsert;

export class UserSkillRepository {
    async findAll() {
        return db
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

    async findBySkillId(skillId: number): Promise<UserSkill | undefined> {
        const [userSkill] = await db
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
        const [userSkill] = await db
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
        const deleted = await db
            .delete(userSkills)
            .where(eq(userSkills.skillId, skillId))
            .returning({
                skillId: userSkills.skillId,
            });

        return deleted.length > 0;
    }
}

export const userSkillRepository = new UserSkillRepository();