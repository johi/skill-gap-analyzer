import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { db } from '@/db';
import { skills } from '@/db/schema';
import { JobRepository } from '@/repositories/job-repository';
import { cleanDatabase } from '../helpers/database';

describe('JobRepository', () => {
    let repository: JobRepository;

    beforeEach(async () => {
        await cleanDatabase();
        repository = new JobRepository(db);
    });

    afterEach(async () => {
        await cleanDatabase();
    });

    it('creates a job', async () => {
        const job = await repository.create({
            dateFound: '2026-09-21',
            company: 'Example Company',
            title: 'Senior Backend Developer',
        });

        expect(job).toMatchObject({
            id: 1,
            dateFound: '2026-09-21',
            company: 'Example Company',
            title: 'Senior Backend Developer',
        });
    });

    it('finds a job by id', async () => {
        const created = await repository.create({
            dateFound: '2026-09-21',
            company: 'Example Company',
            title: 'Senior Backend Developer',
        });

        const job = await repository.findById(created.id);

        expect(job).toMatchObject({
            id: created.id,
            company: 'Example Company',
            title: 'Senior Backend Developer',
            skills: [],
            languageRequirements: [],
        });
    });

    it('returns undefined when a job does not exist', async () => {
        const job = await repository.findById(999);

        expect(job).toBeUndefined();
    });

    it('returns jobs ordered by date found descending', async () => {
        await repository.create({
            dateFound: '2026-09-19',
            company: 'Company A',
            title: 'Developer A',
        });

        await repository.create({
            dateFound: '2026-09-21',
            company: 'Company B',
            title: 'Developer B',
        });

        await repository.create({
            dateFound: '2026-09-20',
            company: 'Company C',
            title: 'Developer C',
        });

        const jobs = await repository.findAll();

        expect(jobs.map((job) => job.dateFound)).toEqual([
            '2026-09-21',
            '2026-09-20',
            '2026-09-19',
        ]);
    });

    it('updates a job', async () => {
        const created = await repository.create({
            dateFound: '2026-09-21',
            company: 'Example Company',
            title: 'Backend Developer',
        });

        const updated = await repository.update(created.id, {
            title: 'Senior Backend Developer',
            interest: 90,
        });

        expect(updated).toMatchObject({
            id: created.id,
            title: 'Senior Backend Developer',
            interest: 90,
        });
    });

    it('replaces and returns language requirements', async () => {
        const created = await repository.create({
            dateFound: '2026-09-21',
            company: 'Example Company',
            title: 'Senior Backend Developer',
        });

        await repository.replaceLanguageRequirements(
            created.id,
            [
                {
                    language: 'en',
                    requirement: 'required',
                },
                {
                    language: 'da',
                    requirement: 'preferred',
                },
            ]
        );

        const job = await repository.findById(created.id);

        expect(job?.languageRequirements).toEqual(
            expect.arrayContaining([
                {
                    language: 'en',
                    requirement: 'required',
                },
                {
                    language: 'da',
                    requirement: 'preferred',
                },
            ])
        );
    });

    it('replaces existing language requirements', async () => {
        const created = await repository.create({
            dateFound: '2026-09-21',
            company: 'Example Company',
            title: 'Senior Backend Developer',
        });

        await repository.replaceLanguageRequirements(
            created.id,
            [
                {
                    language: 'en',
                    requirement: 'required',
                },
                {
                    language: 'da',
                    requirement: 'preferred',
                },
            ]
        );

        await repository.replaceLanguageRequirements(
            created.id,
            [
                {
                    language: 'de',
                    requirement: 'required',
                },
            ]
        );

        const job = await repository.findById(created.id);

        expect(job?.languageRequirements).toEqual([
            {
                language: 'de',
                requirement: 'required',
            },
        ]);
    });

    it('removes language requirements when replaced with an empty list', async () => {
        const created = await repository.create({
            dateFound: '2026-09-21',
            company: 'Example Company',
            title: 'Senior Backend Developer',
        });

        await repository.replaceLanguageRequirements(
            created.id,
            [
                {
                    language: 'en',
                    requirement: 'required',
                },
            ]
        );

        await repository.replaceLanguageRequirements(
            created.id,
            []
        );

        const job = await repository.findById(created.id);

        expect(job?.languageRequirements).toEqual([]);
    });

    it('deletes a job', async () => {
        const created = await repository.create({
            dateFound: '2026-09-21',
            company: 'Example Company',
            title: 'Senior Backend Developer',
        });

        const deleted = await repository.delete(created.id);

        expect(deleted).toBe(true);

        const result = await repository.findById(created.id);

        expect(result).toBeUndefined();
    });

    it('returns false when deleting a nonexistent job', async () => {
        const deleted = await repository.delete(999);

        expect(deleted).toBe(false);
    });
    it('keeps each job’s relationships separate in paginated and complete results', async () => {
        const first = await repository.create({
            dateFound: '2026-10-15',
            company: 'Alpha',
            title: 'Developer A',
        });
        const second = await repository.create({
            dateFound: '2026-10-14',
            company: 'Beta',
            title: 'Developer B',
        });
        const withoutRelations = await repository.create({
            dateFound: '2026-10-13',
            company: 'Gamma',
            title: 'Developer C',
        });

        const [typescript, postgres] = await db.insert(skills).values([
            { name: 'TypeScript', category: 'Programming Languages' },
            { name: 'PostgreSQL', category: 'Databases' },
        ]).returning();

        await repository.replaceSkills(first.id, [
            { skillId: typescript.id, requirement: 'must_have' },
        ]);
        await repository.replaceSkills(second.id, [
            { skillId: postgres.id, requirement: 'nice_to_have' },
        ]);
        await repository.replaceContacts(first.id, [{ email: 'alpha@example.com' }]);
        await repository.replaceContacts(second.id, [{ email: 'beta@example.com' }]);
        await repository.replaceLanguageRequirements(first.id, [
            { language: 'en', requirement: 'required' },
        ]);
        await repository.replaceLanguageRequirements(second.id, [
            { language: 'da', requirement: 'preferred' },
        ]);

        const page = await repository.findPage({
            search: '', sortBy: 'company', sortOrder: 'asc', page: 1, pageSize: 10,
        });
        const all = await repository.findAll();

        for (const results of [page.data, all]) {
            expect(results).toHaveLength(3);
            const byId = new Map(results.map((job) => [job.id, job]));

            expect(byId.get(first.id)?.skills).toEqual([
                { id: typescript.id, name: 'TypeScript',
                    category: 'Programming Languages', requirement: 'must_have' },
            ]);
            expect(byId.get(second.id)?.skills).toEqual([
                { id: postgres.id, name: 'PostgreSQL',
                    category: 'Databases', requirement: 'nice_to_have' },
            ]);
            expect(byId.get(first.id)?.contacts).toEqual([
                expect.objectContaining({ jobId: first.id, email: 'alpha@example.com' }),
            ]);
            expect(byId.get(second.id)?.contacts).toEqual([
                expect.objectContaining({ jobId: second.id, email: 'beta@example.com' }),
            ]);
            expect(byId.get(first.id)?.languageRequirements).toEqual([
                { language: 'en', requirement: 'required' },
            ]);
            expect(byId.get(second.id)?.languageRequirements).toEqual([
                { language: 'da', requirement: 'preferred' },
            ]);
            expect(byId.get(withoutRelations.id)).toMatchObject({
                contacts: [], skills: [], languageRequirements: [],
            });
        }
    });

    it('clamps an out-of-range page and retrieves the last available page', async () => {
        await repository.create({ dateFound: '2026-10-14', company: 'Alpha', title: 'Developer' });

        const result = await repository.findPage({
            search: '', sortBy: 'company', sortOrder: 'asc', page: 100, pageSize: 10,
        });

        expect(result.data.map(job => job.company)).toEqual(['Alpha']);
        expect(result.pagination).toEqual({
            page: 1, pageSize: 10, totalItems: 1, totalPages: 1,
        });
    });

    it('filters and paginates without losing totals', async () => {
        for (const [company, workModel] of [
            ['Alpha', 'hybrid'], ['Beta', 'hybrid'], ['Gamma', 'remote'],
        ]) {
            await repository.create({ dateFound: '2026-10-14', company,
                title: 'Developer', workModel });
        }
        const result = await repository.findPage({
            search: '', workModel: 'hybrid', sortBy: 'company',
            sortOrder: 'asc', page: 1, pageSize: 10,
        });
        expect(result.data.map((job) => job.company)).toEqual(['Alpha', 'Beta']);
        expect(result.pagination).toEqual({
            page: 1, pageSize: 10, totalItems: 2, totalPages: 1,
        });
    });

});
