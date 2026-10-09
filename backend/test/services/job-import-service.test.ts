import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { JobImportService } from '@/services/job-import-service';
import type { SkillRepository } from '@/repositories/skill-repository';

describe('JobImportService', () => {
    const skillRepository = {
        findByName: vi.fn(),
    };

    let service: JobImportService;

    beforeEach(() => {
        vi.resetAllMocks();

        service = new JobImportService(
            skillRepository as unknown as SkillRepository
        );
    });

    it('handles an empty dataset', async () => {
        const result = await service.analyze({
            version: 1,
            jobs: [],
        });

        expect(result).toEqual({
            version: 1,
            totalJobs: 0,
            requiresReview: false,
            jobs: [],
        });

        expect(skillRepository.findByName)
            .not.toHaveBeenCalled();
    });

    it('resolves an existing skill to its canonical skill', async () => {
        skillRepository.findByName.mockResolvedValue({
            id: 10,
            name: 'TypeScript',
            category: 'language',
        });

        const job = {
            dateFound: '2026-10-05',
            company: 'Example Company',
            title: 'Senior Backend Developer',
            languageRequirements: [],
            skills: [
                {
                    name: 'typescript',
                    category: 'language',
                    requirement: 'must_have' as const,
                },
            ],
        };

        const result = await service.analyze({
            version: 1,
            jobs: [job],
        });

        expect(skillRepository.findByName)
            .toHaveBeenCalledWith('typescript');

        expect(result.jobs[0].skills).toEqual([
            {
                name: 'typescript',
                category: 'language',
                requirement: 'must_have',
                resolution: 'existing',
                canonicalSkillId: 10,
                canonicalName: 'TypeScript',
            },
        ]);
    });

    it('marks an unknown skill as new without creating it', async () => {
        skillRepository.findByName.mockResolvedValue(
            undefined
        );

        const job = {
            dateFound: '2026-10-05',
            company: 'Example Company',
            title: 'Senior Backend Developer',
            languageRequirements: [],
            skills: [
                {
                    name: 'Fastify',
                    category: 'framework',
                    requirement: 'nice_to_have' as const,
                },
            ],
        };

        const result = await service.analyze({
            version: 1,
            jobs: [job],
        });

        expect(result.jobs[0].skills).toEqual([
            {
                name: 'Fastify',
                category: 'framework',
                requirement: 'nice_to_have',
                resolution: 'new',
                canonicalSkillId: null,
                canonicalName: 'Fastify',
            },
        ]);
    });

    it('collapses duplicate canonical skills with the same requirement', async () => {
        skillRepository.findByName.mockResolvedValue({
            id: 10,
            name: 'TypeScript',
            category: 'language',
        });

        const result = await service.analyze({
            version: 1,
            jobs: [{
                dateFound: '2026-10-05',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                languageRequirements: [],
                skills: [
                    {
                        name: 'TypeScript',
                        category: 'language',
                        requirement: 'must_have',
                    },
                    {
                        name: 'typescript',
                        category: 'language',
                        requirement: 'must_have',
                    },
                ],
            }],
        });

        expect(result.jobs[0].skills).toHaveLength(1);

        expect(result.jobs[0].skills[0]).toMatchObject({
            resolution: 'existing',
            canonicalSkillId: 10,
            canonicalName: 'TypeScript',
            requirement: 'must_have',
        });
    });

    it('marks duplicate canonical skills with different requirements for review', async () => {
        skillRepository.findByName.mockResolvedValue({
            id: 10,
            name: 'TypeScript',
            category: 'language',
        });

        const result = await service.analyze({
            version: 1,
            jobs: [{
                dateFound: '2026-10-05',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                languageRequirements: [],
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
            }],
        });
        expect(result.requiresReview).toBe(true);
        expect(result.jobs[0].skills).toHaveLength(1);

        expect(result.jobs[0].skills[0]).toMatchObject({
            resolution: 'review_required',
            canonicalSkillId: 10,
            canonicalName: 'TypeScript',
            conflictingRequirements: [
                'must_have',
                'nice_to_have',
            ],
        });
    });

    it('collapses duplicate unknown skills case-insensitively', async () => {
        skillRepository.findByName.mockResolvedValue(
            undefined
        );

        const result = await service.analyze({
            version: 1,
            jobs: [{
                dateFound: '2026-10-05',
                company: 'Example Company',
                title: 'Senior Backend Developer',
                languageRequirements: [],
                skills: [
                    {
                        name: 'Fastify',
                        category: 'framework',
                        requirement: 'must_have',
                    },
                    {
                        name: 'fastify',
                        category: 'framework',
                        requirement: 'must_have',
                    },
                ],
            }],
        });

        expect(result.jobs[0].skills).toHaveLength(1);

        expect(result.jobs[0].skills[0]).toMatchObject({
            name: 'Fastify',
            resolution: 'new',
            canonicalSkillId: null,
            canonicalName: 'Fastify',
            requirement: 'must_have',
        });
    });
});