
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { UserSkillService } from '../../src/services/user-skill-service';
import { SkillRepository } from '../../src/repositories/skill-repository';
import { UserSkillRepository } from '../../src/repositories/user-skill-repository';

import { NotFoundError } from '../../src/errors/application-errors';

describe('UserSkillService', () => {
    const skill = {
        id: 1,
        name: 'TypeScript',
        category: 'language',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const assessment = {
        skillId: 1,
        level: 3,
        updatedAt: new Date(),
    };

    const skillRepository = {
        findById: vi.fn(),
    };

    const userSkillRepository = {
        findAll: vi.fn(),
        findBySkillId: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
    };

    let service: UserSkillService;

    beforeEach(() => {
        vi.resetAllMocks();

        service = new UserSkillService(
            userSkillRepository as unknown as UserSkillRepository,
            skillRepository as unknown as SkillRepository
        );
    });

    it('lists assessments', async () => {
        const assessments = [{
            ...assessment,
            name: 'TypeScript',
            category: 'language',
        }];

        userSkillRepository.findAll.mockResolvedValue(
            assessments
        );

        expect(await service.list())
            .toEqual(assessments);
    });

    it('retrieves an existing assessment', async () => {
        userSkillRepository.findBySkillId.mockResolvedValue(
            assessment
        );

        expect(await service.get(1))
            .toEqual(assessment);

        expect(userSkillRepository.findBySkillId)
            .toHaveBeenCalledWith(1);
    });

    it('rejects an unknown assessment', async () => {
        userSkillRepository.findBySkillId.mockResolvedValue(
            undefined
        );

        await expect(service.get(99))
            .rejects.toThrow(NotFoundError);
    });

    it('creates an assessment for an existing skill', async () => {
        skillRepository.findById.mockResolvedValue(skill);
        userSkillRepository.upsert.mockResolvedValue(
            assessment
        );

        expect(await service.setLevel(1, 3))
            .toEqual(assessment);

        expect(skillRepository.findById)
            .toHaveBeenCalledWith(1);

        expect(userSkillRepository.upsert)
            .toHaveBeenCalledWith(1, 3);
    });

    it('rejects assessments for unknown skills', async () => {
        skillRepository.findById.mockResolvedValue(
            undefined
        );

        await expect(service.setLevel(99, 3))
            .rejects.toThrow(NotFoundError);

        expect(userSkillRepository.upsert)
            .not.toHaveBeenCalled();
    });

    it.each([0, 1, 2, 3, 4, 5])(
        'accepts proficiency level %i',
        async (level) => {
            skillRepository.findById.mockResolvedValue(
                skill
            );

            userSkillRepository.upsert.mockResolvedValue({
                ...assessment,
                level,
            });

            const result = await service.setLevel(
                1,
                level
            );

            expect(result.level).toBe(level);

            expect(userSkillRepository.upsert)
                .toHaveBeenCalledWith(1, level);
        }
    );

    it('deletes an existing assessment', async () => {
        userSkillRepository.delete.mockResolvedValue(true);

        await expect(service.delete(1))
            .resolves.toBeUndefined();

        expect(userSkillRepository.delete)
            .toHaveBeenCalledWith(1);
    });

    it('rejects deleting an unknown assessment', async () => {
        userSkillRepository.delete.mockResolvedValue(false);

        await expect(service.delete(99))
            .rejects.toThrow(NotFoundError);
    });
});