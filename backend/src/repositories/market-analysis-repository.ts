
import { and, countDistinct, eq, ne, or, sql } from 'drizzle-orm';

import { jobs, jobSkills, skills } from '@/db/schema';
import type { DatabaseExecutor } from '@/repositories/types';

export interface SkillDemandRow {
    skillId: number;
    name: string;
    category: string;
    jobCount: number;
    mustHaveCount: number;
    niceToHaveCount: number;
}

export interface SkillDemandData {
    totalJobsAnalyzed: number;
    skills: SkillDemandRow[];
}

export class MarketAnalysisRepository {
    constructor(
        private readonly db: DatabaseExecutor
    ) {}

    async getSkillDemand(): Promise<SkillDemandData> {
        const activeJobCondition = or(
            ne(jobs.applyStatus, 'expired'),
            sql`${jobs.applyStatus} IS NULL`
        );

        const [{ totalJobsAnalyzed }] = await this.db
            .select({
                totalJobsAnalyzed: countDistinct(jobs.id),
            })
            .from(jobs)
            .innerJoin(
                jobSkills,
                eq(jobSkills.jobId, jobs.id)
            )
            .where(activeJobCondition);

        if (totalJobsAnalyzed === 0) {
            return {
                totalJobsAnalyzed: 0,
                skills: [],
            };
        }

        const rows = await this.db
            .select({
                skillId: skills.id,
                name: skills.name,
                category: skills.category,

                jobCount: countDistinct(jobs.id),

                mustHaveCount: sql<number>`
                    COUNT(*) FILTER (
                        WHERE ${jobSkills.requirement} = 'must_have'
                    )::integer
                `,

                niceToHaveCount: sql<number>`
                    COUNT(*) FILTER (
                        WHERE ${jobSkills.requirement} = 'nice_to_have'
                    )::integer
                `,
            })
            .from(jobSkills)
            .innerJoin(
                jobs,
                eq(jobSkills.jobId, jobs.id)
            )
            .innerJoin(
                skills,
                eq(jobSkills.skillId, skills.id)
            )
            .where(activeJobCondition)
            .groupBy(
                skills.id,
                skills.name,
                skills.category
            )
            .orderBy(
                sql`COUNT(DISTINCT ${jobs.id}) DESC`,
                skills.name
            );

        return {
            totalJobsAnalyzed,
            skills: rows,
        };
    }
}
