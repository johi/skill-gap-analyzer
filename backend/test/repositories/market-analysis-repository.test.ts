
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { db } from '@/db';
import { JobRepository } from '@/repositories/job-repository';
import { SkillRepository } from '@/repositories/skill-repository';
import { MarketAnalysisRepository } from '@/repositories/market-analysis-repository';

import { cleanDatabase } from '../helpers/database';

describe('MarketAnalysisRepository', () => {
    let repository: MarketAnalysisRepository;
    let jobRepository: JobRepository;
    let skillRepository: SkillRepository;

    beforeEach(async () => {
        await cleanDatabase();

        repository = new MarketAnalysisRepository(db);
        jobRepository = new JobRepository(db);
        skillRepository = new SkillRepository(db);
    });

    afterEach(async () => {
        await cleanDatabase();
    });

    it('returns empty results when no jobs exist', async () => {
        const result = await repository.getSkillDemand();

        expect(result).toEqual({
            totalJobsAnalyzed: 0,
            skills: [],
        });
    });

    it('excludes jobs without skill associations', async () => {
        await jobRepository.create({
            dateFound: '2026-10-25',
            company: 'Example Company',
            title: 'Backend Developer',
        });

        const result = await repository.getSkillDemand();

        expect(result).toEqual({
            totalJobsAnalyzed: 0,
            skills: [],
        });
    });

    it('counts skill demand and requirement types', async () => {
        const php = await skillRepository.create({
            name: 'PHP',
            category: 'Programming Languages',
        });

        const docker = await skillRepository.create({
            name: 'Docker',
            category: 'DevOps',
        });

        const firstJob = await jobRepository.create({
            dateFound: '2026-10-25',
            company: 'Company A',
            title: 'PHP Developer',
            applyStatus: 'not_applied',
        });

        const secondJob = await jobRepository.create({
            dateFound: '2026-10-25',
            company: 'Company B',
            title: 'Backend Developer',
            applyStatus: 'applied',
        });

        await jobRepository.replaceSkills(firstJob.id, [
            {
                skillId: php.id,
                requirement: 'must_have',
            },
            {
                skillId: docker.id,
                requirement: 'nice_to_have',
            },
        ]);

        await jobRepository.replaceSkills(secondJob.id, [
            {
                skillId: php.id,
                requirement: 'nice_to_have',
            },
        ]);

        const result = await repository.getSkillDemand();

        expect(result.totalJobsAnalyzed).toBe(2);

        expect(result.skills).toEqual([
            {
                skillId: php.id,
                name: 'PHP',
                category: 'Programming Languages',
                jobCount: 2,
                mustHaveCount: 1,
                niceToHaveCount: 1,
            },
            {
                skillId: docker.id,
                name: 'Docker',
                category: 'DevOps',
                jobCount: 1,
                mustHaveCount: 0,
                niceToHaveCount: 1,
            },
        ]);
    });

    it('excludes expired jobs', async () => {
        const php = await skillRepository.create({
            name: 'PHP',
            category: 'Programming Languages',
        });

        const activeJob = await jobRepository.create({
            dateFound: '2026-10-25',
            company: 'Active Company',
            title: 'PHP Developer',
        });

        const expiredJob = await jobRepository.create({
            dateFound: '2026-10-25',
            company: 'Expired Company',
            title: 'PHP Developer',
            applyStatus: 'expired',
        });

        await jobRepository.replaceSkills(activeJob.id, [
            {
                skillId: php.id,
                requirement: 'must_have',
            },
        ]);

        await jobRepository.replaceSkills(expiredJob.id, [
            {
                skillId: php.id,
                requirement: 'must_have',
            },
        ]);

        const result = await repository.getSkillDemand();

        expect(result.totalJobsAnalyzed).toBe(1);
        expect(result.skills).toHaveLength(1);
        expect(result.skills[0].jobCount).toBe(1);
        expect(result.skills[0].mustHaveCount).toBe(1);
    });

    it('includes active jobs with a null application status', async () => {
        const php = await skillRepository.create({
            name: 'PHP',
            category: 'Programming Languages',
        });

        const job = await jobRepository.create({
            dateFound: '2026-10-25',
            company: 'Example Company',
            title: 'PHP Developer',
        });

        await jobRepository.replaceSkills(job.id, [
            {
                skillId: php.id,
                requirement: 'must_have',
            },
        ]);

        const result = await repository.getSkillDemand();

        expect(result.totalJobsAnalyzed).toBe(1);
        expect(result.skills[0].jobCount).toBe(1);
    });
});
