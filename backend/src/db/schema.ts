import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    date,
    timestamp,
    smallint,
    numeric,
    primaryKey,
    unique,
    check,
    index,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';


export const jobs = pgTable(
    'jobs',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),

        dateFound: date('date_found').notNull(),

        company: varchar('company', { length: 255 }).notNull(),
        title: varchar('title', { length: 255 }).notNull(),
        sourceUrl: text('source_url'),
        originalText: text('original_text'),

        location: varchar('location', { length: 255 }),
        workModel: varchar('work_model', { length: 50 }),
        employmentType: varchar('employment_type', { length: 100 }),
        seniority: varchar('seniority', { length: 100 }),
        primaryRole: varchar('primary_role', { length: 100 }),

        yearsRequired: varchar('years_required', { length: 100 }),
        educationRequirement: text('education_requirement'),
        danishRequired: varchar('danish_required', { length: 100 }),
        salaryRate: text('salary_rate'),

        interest: smallint('interest'),
        applyStatus: varchar('apply_status', { length: 50 }),
        gapNotes: text('gap_notes'),

        originalMatch: numeric('original_match', {
            precision: 5,
            scale: 2,
        }),

        createdAt: timestamp('created_at', {
            withTimezone: true,
        }).notNull().defaultNow(),

        updatedAt: timestamp('updated_at', {
            withTimezone: true,
        }).notNull().defaultNow(),
    },
    (table) => [
        check(
            'jobs_interest_check',
            sql`${table.interest} IS NULL OR ${table.interest} BETWEEN 0 AND 100`
        ),

        check(
            'jobs_original_match_check',
            sql`${table.originalMatch} IS NULL OR ${table.originalMatch} BETWEEN 0 AND 100`
        ),

        index('jobs_date_found_idx').on(table.dateFound),
        index('jobs_company_idx').on(table.company),
        index('jobs_apply_status_idx').on(table.applyStatus),
    ]
);


export const skills = pgTable(
    'skills',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),

        name: varchar('name', { length: 255 }).notNull(),
        category: varchar('category', { length: 100 }).notNull(),

        createdAt: timestamp('created_at', {
            withTimezone: true,
        }).notNull().defaultNow(),

        updatedAt: timestamp('updated_at', {
            withTimezone: true,
        }).notNull().defaultNow(),
    },
    (table) => [
        unique('skills_name_unique').on(table.name),
        index('skills_category_idx').on(table.category),
    ]
);


export const jobSkills = pgTable(
    'job_skills',
    {
        jobId: bigint('job_id', { mode: 'number' })
            .notNull()
            .references(() => jobs.id, {
                onDelete: 'cascade',
            }),

        skillId: bigint('skill_id', { mode: 'number' })
            .notNull()
            .references(() => skills.id, {
                onDelete: 'cascade',
            }),

        requirement: varchar('requirement', {
            length: 20,
        }).notNull(),

        createdAt: timestamp('created_at', {
            withTimezone: true,
        }).notNull().defaultNow(),
    },
    (table) => [
        primaryKey({
            columns: [table.jobId, table.skillId],
        }),

        check(
            'job_skills_requirement_check',
            sql`${table.requirement} IN ('must_have', 'nice_to_have')`
        ),

        index('job_skills_skill_id_idx').on(table.skillId),
    ]
);


export const userSkills = pgTable(
    'user_skills',
    {
        skillId: bigint('skill_id', { mode: 'number' })
            .primaryKey()
            .references(() => skills.id, {
                onDelete: 'cascade',
            }),

        level: smallint('level').notNull(),

        updatedAt: timestamp('updated_at', {
            withTimezone: true,
        }).notNull().defaultNow(),
    },
    (table) => [
        check(
            'user_skills_level_check',
            sql`${table.level} BETWEEN 0 AND 5`
        ),
    ]
);