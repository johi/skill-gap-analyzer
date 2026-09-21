import { db } from '../db';

import {
    JobRepository,
    JobWithSkills,
} from '../repositories/job-repository';

import {
    SkillRepository,
} from '../repositories/skill-repository';

import {
    CreateJobInput,
    JobSkillInput,
    UpdateJobInput,
} from '../schemas/job';

import {
    ConflictError,
    NotFoundError,
} from '../errors/application-errors';

export class JobService {
    async list() {
        const repository = new JobRepository(db);

        return repository.findAll();
    }

    async get(id: number): Promise<JobWithSkills> {
        const repository = new JobRepository(db);

        const job = await repository.findById(id);

        if (!job) {
            throw new NotFoundError(`Job ${id} not found`);
        }

        return job;
    }

    async create(
        input: CreateJobInput
    ): Promise<JobWithSkills> {
        return db.transaction(async (tx) => {
            const jobRepository = new JobRepository(tx);
            const skillRepository = new SkillRepository(tx);

            const {
                skills,
                ...jobData
            } = input;

            const job = await jobRepository.create(jobData);

            const assignedSkills =
                await this.resolveSkills(
                    skills,
                    skillRepository
                );

            await jobRepository.replaceSkills(
                job.id,
                assignedSkills
            );

            const created =
                await jobRepository.findById(job.id);

            if (!created) {
                throw new Error(
                    `Created job ${job.id} could not be retrieved`
                );
            }

            return created;
        });
    }

    async update(
        id: number,
        input: UpdateJobInput
    ): Promise<JobWithSkills> {
        return db.transaction(async (tx) => {
            const jobRepository = new JobRepository(tx);
            const skillRepository = new SkillRepository(tx);

            const existing =
                await jobRepository.findById(id);

            if (!existing) {
                throw new NotFoundError(
                    `Job ${id} not found`
                );
            }

            const {
                skills,
                ...jobData
            } = input;

            await jobRepository.update(id, jobData);

            const assignedSkills =
                await this.resolveSkills(
                    skills,
                    skillRepository
                );

            await jobRepository.replaceSkills(
                id,
                assignedSkills
            );

            const updated =
                await jobRepository.findById(id);

            if (!updated) {
                throw new Error(
                    `Updated job ${id} could not be retrieved`
                );
            }

            return updated;
        });
    }

    async delete(id: number): Promise<void> {
        const repository = new JobRepository(db);

        const deleted = await repository.delete(id);

        if (!deleted) {
            throw new NotFoundError(`Job ${id} not found`);
        }
    }

    private async resolveSkills(
        requestedSkills: JobSkillInput[],
        skillRepository: SkillRepository
    ): Promise<Array<{
        skillId: number;
        requirement: 'must_have' | 'nice_to_have';
    }>> {
        const resolved: Array<{
            skillId: number;
            requirement: 'must_have' | 'nice_to_have';
        }> = [];

        const seen = new Set<string>();

        for (const requestedSkill of requestedSkills) {
            const normalizedName =
                requestedSkill.name.trim().toLowerCase();

            if (seen.has(normalizedName)) {
                throw new ConflictError(
                    `Skill '${requestedSkill.name}' occurs more than once in the job`
                );
            }

            seen.add(normalizedName);

            let skill =
                await skillRepository.findByName(
                    requestedSkill.name
                );

            if (!skill) {
                skill = await skillRepository.create({
                    name: requestedSkill.name,
                    category: requestedSkill.category,
                });
            }

            resolved.push({
                skillId: skill.id,
                requirement: requestedSkill.requirement,
            });
        }

        return resolved;
    }
}