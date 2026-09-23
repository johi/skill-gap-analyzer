
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { JobService } from '../../src/services/job-service';

import {
    ConflictError,
    NotFoundError,
} from '../../src/errors/application-errors';

import type {
    CreateJobInput,
    UpdateJobInput,
} from '../../src/schemas/job';

const mocks = vi.hoisted(() => {
    const jobRepository = {
        findAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        replaceSkills: vi.fn(),
    };

    const skillRepository = {
        findByName: vi.fn(),
        create: vi.fn(),
    };

    return {
        jobRepository,
        skillRepository,
        transaction: vi.fn(),
        jobRepositoryConstructor: vi.fn(),
        skillRepositoryConstructor: vi.fn(),
        transactionExecutor: {
            kind: 'mock-transaction',
        },
    };
});

vi.mock('../../src/db', () => ({
    db: {
        transaction: mocks.transaction,
    },
}));

vi.mock('../../src/repositories/job-repository', () => ({
    JobRepository: class {
        constructor(executor: unknown) {
            mocks.jobRepositoryConstructor(executor);

            return mocks.jobRepository;
        }
    },
}));

vi.mock('../../src/repositories/skill-repository', () => ({
    SkillRepository: class {
        constructor(executor: unknown) {
            mocks.skillRepositoryConstructor(executor);

            return mocks.skillRepository;
        }
    },
}));

describe('JobService', () => {
    const job = {
        id: 1,
        dateFound: '2026-09-21',
        company: 'Example Company',
        title: 'Senior Backend Developer',
    };

    const jobWithSkills = {
        ...job,
        skills: [],
    };

    const input: CreateJobInput = {
        dateFound: '2026-09-21',
        company: 'Example Company',
        title: 'Senior Backend Developer',
        skills: [],
    };

    let service: JobService;

    beforeEach(() => {
        vi.resetAllMocks();

        mocks.transaction.mockImplementation(
            async (
                callback: (
                    tx: typeof mocks.transactionExecutor
                ) => Promise<unknown>
            ) => callback(mocks.transactionExecutor)
        );

        service = new JobService();
    });

    it('lists jobs', async () => {
        mocks.jobRepository.findAll.mockResolvedValue([job]);

        expect(await service.list()).toEqual([job]);

        expect(mocks.jobRepository.findAll)
            .toHaveBeenCalledOnce();
    });

    it('retrieves an existing job', async () => {
        mocks.jobRepository.findById.mockResolvedValue(
            jobWithSkills
        );

        expect(await service.get(1))
            .toEqual(jobWithSkills);

        expect(mocks.jobRepository.findById)
            .toHaveBeenCalledWith(1);
    });

    it('rejects an unknown job', async () => {
        mocks.jobRepository.findById.mockResolvedValue(
            undefined
        );

        await expect(service.get(99))
            .rejects.toThrow(NotFoundError);
    });

    it('creates a job inside a transaction', async () => {
        mocks.jobRepository.create.mockResolvedValue(job);

        mocks.jobRepository.findById.mockResolvedValue(
            jobWithSkills
        );

        const result = await service.create(input);

        expect(result).toEqual(jobWithSkills);

        expect(mocks.transaction)
            .toHaveBeenCalledOnce();

        expect(mocks.jobRepositoryConstructor)
            .toHaveBeenCalledWith(
                mocks.transactionExecutor
            );

        expect(mocks.skillRepositoryConstructor)
            .toHaveBeenCalledWith(
                mocks.transactionExecutor
            );

        const { skills, ...jobData } = input;

        expect(mocks.jobRepository.create)
            .toHaveBeenCalledWith(jobData);

        expect(mocks.jobRepository.replaceSkills)
            .toHaveBeenCalledWith(1, []);
    });

    it('reuses existing skills', async () => {
        mocks.jobRepository.create.mockResolvedValue(job);

        mocks.skillRepository.findByName.mockResolvedValue({
            id: 10,
            name: 'TypeScript',
            category: 'language',
        });

        mocks.jobRepository.findById.mockResolvedValue(
            jobWithSkills
        );

        await service.create({
            ...input,
            skills: [{
                name: 'TypeScript',
                category: 'language',
                requirement: 'must_have',
            }],
        });

        expect(mocks.skillRepository.findByName)
            .toHaveBeenCalledWith('TypeScript');

        expect(mocks.skillRepository.create)
            .not.toHaveBeenCalled();

        expect(mocks.jobRepository.replaceSkills)
            .toHaveBeenCalledWith(1, [{
                skillId: 10,
                requirement: 'must_have',
            }]);
    });

    it('creates missing skills', async () => {
        mocks.jobRepository.create.mockResolvedValue(job);

        mocks.skillRepository.findByName.mockResolvedValue(
            undefined
        );

        mocks.skillRepository.create.mockResolvedValue({
            id: 20,
            name: 'PostgreSQL',
            category: 'database',
        });

        mocks.jobRepository.findById.mockResolvedValue(
            jobWithSkills
        );

        await service.create({
            ...input,
            skills: [{
                name: 'PostgreSQL',
                category: 'database',
                requirement: 'nice_to_have',
            }],
        });

        expect(mocks.skillRepository.create)
            .toHaveBeenCalledWith({
                name: 'PostgreSQL',
                category: 'database',
            });

        expect(mocks.jobRepository.replaceSkills)
            .toHaveBeenCalledWith(1, [{
                skillId: 20,
                requirement: 'nice_to_have',
            }]);
    });

    it('rejects duplicate skill names case-insensitively', async () => {
        mocks.jobRepository.create.mockResolvedValue(job);

        mocks.skillRepository.findByName.mockResolvedValue({
            id: 10,
            name: 'TypeScript',
            category: 'language',
        });

        await expect(
            service.create({
                ...input,
                skills: [
                    {
                        name: 'TypeScript',
                        category: 'language',
                        requirement: 'must_have',
                    },
                    {
                        name: 'typescript',
                        category: 'language',
                        requirement: 'nice_to_have',
                    },
                ],
            })
        ).rejects.toThrow(ConflictError);

        expect(mocks.jobRepository.replaceSkills)
            .not.toHaveBeenCalled();
    });

    it('rejects duplicate skill names with whitespace', async () => {
        mocks.jobRepository.create.mockResolvedValue(job);

        mocks.skillRepository.findByName.mockResolvedValue({
            id: 10,
            name: 'TypeScript',
            category: 'language',
        });

        await expect(
            service.create({
                ...input,
                skills: [
                    {
                        name: 'TypeScript',
                        category: 'language',
                        requirement: 'must_have',
                    },
                    {
                        name: ' TypeScript ',
                        category: 'language',
                        requirement: 'nice_to_have',
                    },
                ],
            })
        ).rejects.toThrow(ConflictError);
    });

    it('rejects a created job that cannot be retrieved', async () => {
        mocks.jobRepository.create.mockResolvedValue(job);

        mocks.jobRepository.findById.mockResolvedValue(
            undefined
        );

        await expect(service.create(input))
            .rejects.toThrow(
                'Created job 1 could not be retrieved'
            );
    });

    it('propagates transaction errors', async () => {
        const error = new Error('Database failure');

        mocks.jobRepository.create.mockResolvedValue(job);

        mocks.jobRepository.replaceSkills.mockRejectedValue(
            error
        );

        await expect(service.create(input))
            .rejects.toBe(error);

        expect(mocks.transaction)
            .toHaveBeenCalledOnce();
    });

    it('updates an existing job', async () => {
        const updatedJob = {
            ...jobWithSkills,
            title: 'Lead Backend Developer',
        };

        mocks.jobRepository.findById
            .mockResolvedValueOnce(jobWithSkills)
            .mockResolvedValueOnce(updatedJob);

        mocks.jobRepository.update.mockResolvedValue(
            updatedJob
        );

        const updateInput: UpdateJobInput = {
            ...input,
            title: 'Lead Backend Developer',
        };

        const result = await service.update(
            1,
            updateInput
        );

        expect(result).toEqual(updatedJob);

        expect(mocks.transaction)
            .toHaveBeenCalledOnce();

        const { skills, ...jobData } = updateInput;

        expect(mocks.jobRepository.update)
            .toHaveBeenCalledWith(1, jobData);

        expect(mocks.jobRepository.replaceSkills)
            .toHaveBeenCalledWith(1, []);
    });

    it('rejects updating an unknown job', async () => {
        mocks.jobRepository.findById.mockResolvedValue(
            undefined
        );

        await expect(
            service.update(99, input)
        ).rejects.toThrow(NotFoundError);

        expect(mocks.jobRepository.update)
            .not.toHaveBeenCalled();

        expect(mocks.jobRepository.replaceSkills)
            .not.toHaveBeenCalled();
    });

    it('rejects an updated job that cannot be retrieved', async () => {
        mocks.jobRepository.findById
            .mockResolvedValueOnce(jobWithSkills)
            .mockResolvedValueOnce(undefined);

        await expect(
            service.update(1, input)
        ).rejects.toThrow(
            'Updated job 1 could not be retrieved'
        );
    });

    it('deletes an existing job', async () => {
        mocks.jobRepository.delete.mockResolvedValue(true);

        await expect(service.delete(1))
            .resolves.toBeUndefined();

        expect(mocks.jobRepository.delete)
            .toHaveBeenCalledWith(1);
    });

    it('rejects deleting an unknown job', async () => {
        mocks.jobRepository.delete.mockResolvedValue(false);

        await expect(service.delete(99))
            .rejects.toThrow(NotFoundError);
    });
});