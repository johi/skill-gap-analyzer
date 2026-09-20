import { asc, eq, ilike } from 'drizzle-orm';

import { db } from '../db';
import { skills } from '../db/schema';

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

export class SkillRepository {
    async findAll(): Promise<Skill[]> {
        return db
            .select()
            .from(skills)
            .orderBy(asc(skills.name));
    }

    async findById(id: number): Promise<Skill | undefined> {
        const [skill] = await db
            .select()
            .from(skills)
            .where(eq(skills.id, id))
            .limit(1);

        return skill;
    }

    async findByName(name: string): Promise<Skill | undefined> {
        const [skill] = await db
            .select()
            .from(skills)
            .where(ilike(skills.name, name))
            .limit(1);

        return skill;
    }

    async create(data: NewSkill): Promise<Skill> {
        const [skill] = await db
            .insert(skills)
            .values(data)
            .returning();

        return skill;
    }

    async update(
        id: number,
        data: Partial<NewSkill>
    ): Promise<Skill | undefined> {
        const [skill] = await db
            .update(skills)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(skills.id, id))
            .returning();

        return skill;
    }

    async delete(id: number): Promise<boolean> {
        const deleted = await db
            .delete(skills)
            .where(eq(skills.id, id))
            .returning({
                id: skills.id,
            });

        return deleted.length > 0;
    }
}

export const skillRepository = new SkillRepository();