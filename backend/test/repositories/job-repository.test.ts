import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { db } from '../../src/db';
import { JobRepository } from '../../src/repositories/job-repository';
import { cleanDatabase } from './helpers';

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
});