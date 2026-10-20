import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { db } from '@/db';
import { JobRepository } from '@/repositories/job-repository';
import { JobImportCommitService } from '@/services/job-import-commit-service';
import { SkillRepository } from '@/repositories/skill-repository';
import {
    JobDataset,
    ReviewedImport,
} from '@/schemas/job-dataset';
import { cleanDatabase } from '../helpers/database';

describe('JobImportCommitService', () => {
    const service = new JobImportCommitService();

    const dataset: JobDataset = {
        version: 1,
        jobs: [
            {
                dateFound: '2026-10-10',
                company: 'Company A',
                title: 'Backend Developer',
                languageRequirements: [],
                skills: [],
            },
            {
                dateFound: '2026-10-11',
                company: 'Company B',
                title: 'Senior Backend Developer',
                languageRequirements: [],
                skills: [],
            },
        ],
    };

    const createReviewedImport = (): ReviewedImport => ({
        version: 1,
        jobs: dataset.jobs.map((job, jobIndex) => ({
            jobIndex,
            excluded: false,
            job: structuredClone(job),
        })),
    });

    beforeEach(async () => {
        await cleanDatabase();
    });

    afterEach(async () => {
        await cleanDatabase();
    });

    it('replaces jobs while preserving the skill catalogue', async () => {
        const repository = new JobRepository(db);
        const skillRepository = new SkillRepository(db);
        const original = await service.commit(dataset, createReviewedImport());
        const skill = await skillRepository.create({ name: 'Preserved skill', category: 'Backend' });

        const replacement: JobDataset = {
            version: 1,
            jobs: [{
                dateFound: '2026-10-20',
                company: 'Replacement',
                title: 'Engineer',
                languageRequirements: [],
                skills: [],
            }],
        };
        const review: ReviewedImport = {
            version: 1,
            jobs: [{ jobIndex: 0, excluded: false, job: structuredClone(replacement.jobs[0]!) }],
        };

        const result = await service.commit(replacement, review, true);
        expect(result.imported).toBe(1);
        const jobs = await repository.findAll();
        expect(jobs).toHaveLength(1);
        expect(jobs[0]?.company).toBe('Replacement');
        expect(jobs.some(job => original.jobIds.includes(job.id))).toBe(false);
        expect(await skillRepository.findById(skill.id)).toBeDefined();
    });

    it('does not delete existing jobs when replacement review fails', async () => {
        await service.commit(dataset, createReviewedImport());
        const invalid = createReviewedImport();
        invalid.jobs.pop();
        await expect(service.commit(dataset, invalid, true)).rejects.toThrow();
        expect(await new JobRepository(db).findAll()).toHaveLength(2);
    });

    it('persists all approved jobs in a single batch', async () => {
        const result = await service.commit(
            dataset,
            createReviewedImport()
        );

        expect(result.imported).toBe(2);
        expect(result.excluded).toBe(0);
        expect(result.jobIds).toHaveLength(2);

        const repository = new JobRepository(db);
        const jobs = await repository.findAll();

        expect(jobs).toHaveLength(2);

        expect(jobs.map((job) => job.company)).toEqual(
            expect.arrayContaining([
                'Company A',
                'Company B',
            ])
        );

        expect(jobs.map((job) => job.id)).toEqual(
            expect.arrayContaining(result.jobIds)
        );
    });

    it('does not persist excluded jobs', async () => {
        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[1].excluded = true;

        const result = await service.commit(
            dataset,
            reviewedImport
        );

        expect(result.imported).toBe(1);
        expect(result.excluded).toBe(1);
        expect(result.jobIds).toHaveLength(1);

        const repository = new JobRepository(db);
        const jobs = await repository.findAll();

        expect(jobs).toHaveLength(1);
        expect(jobs[0].company).toBe('Company A');
        expect(jobs[0].id).toBe(result.jobIds[0]);
    });

    it('rolls back all jobs when a later job fails', async () => {
        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[1].job.skills = [
            {
                name: 'PostgreSQL',
                category: 'database',
                requirement: 'must_have',
            },
        ];

        // Force a database constraint violation on the second job.
        reviewedImport.jobs[1].job.title = null as unknown as string;

        await expect(
            service.commit(dataset, reviewedImport)
        ).rejects.toThrow();

        const repository = new JobRepository(db);
        const jobs = await repository.findAll();

        expect(jobs).toHaveLength(0);
    });

    it('rolls back newly created skills when a later job fails', async () => {
        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[0].job.skills = [
            {
                name: 'RollbackTestSkill',
                category: 'framework',
                requirement: 'must_have',
            },
        ];

        reviewedImport.jobs[1].job.title =
            null as unknown as string;

        await expect(
            service.commit(dataset, reviewedImport)
        ).rejects.toThrow();

        const jobRepository = new JobRepository(db);
        const skillRepository = new SkillRepository(db);

        const jobs = await jobRepository.findAll();
        const skill = await skillRepository.findByName(
            'RollbackTestSkill'
        );

        expect(jobs).toHaveLength(0);
        expect(skill).toBeUndefined();
    });

    it('rejects malformed reviewed jobs with a Zod validation error', async () => {
        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[1].job.title =
            null as unknown as string;

        await expect(
            service.commit(dataset, reviewedImport)
        ).rejects.toMatchObject({
            name: 'ZodError',
        });

        const repository = new JobRepository(db);

        expect(await repository.findAll()).toHaveLength(0);
    });
});