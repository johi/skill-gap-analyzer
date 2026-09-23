
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { SkillService } from '../../src/services/skill-service';
import { SkillRepository } from '../../src/repositories/skill-repository';

import {
    ConflictError,
    NotFoundError,
} from '../../src/errors/application-errors';

describe('SkillService', () => {
    const skill = {
        id: 1,
        name: 'TypeScript',
        category: 'language',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const repository = {
        findAll: vi.fn(),
        findById: vi.fn(),
        findByName: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    let service: SkillService;

    beforeEach(() => {
        vi.resetAllMocks();

        service = new SkillService(
            repository as unknown as SkillRepository
        );
    });

    it('lists skills', async () => {
        repository.findAll.mockResolvedValue([skill]);

        expect(await service.list()).toEqual([skill]);
        expect(repository.findAll).toHaveBeenCalledOnce();
    });

    it('retrieves an existing skill', async () => {
        repository.findById.mockResolvedValue(skill);

        expect(await service.get(1)).toEqual(skill);
        expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('rejects an unknown skill', async () => {
        repository.findById.mockResolvedValue(undefined);

        await expect(service.get(99))
            .rejects.toThrow(NotFoundError);
    });

    it('creates a new skill', async () => {
        repository.findByName.mockResolvedValue(undefined);
        repository.create.mockResolvedValue(skill);

        const input = {
            name: 'TypeScript',
            category: 'language',
        };

        expect(await service.create(input)).toEqual(skill);

        expect(repository.findByName)
            .toHaveBeenCalledWith(input.name);

        expect(repository.create)
            .toHaveBeenCalledWith(input);
    });

    it('rejects duplicate skills', async () => {
        repository.findByName.mockResolvedValue(skill);

        await expect(
            service.create({
                name: 'TypeScript',
                category: 'language',
            })
        ).rejects.toThrow(ConflictError);

        expect(repository.create).not.toHaveBeenCalled();
    });

    it('updates an existing skill', async () => {
        const updated = {
            ...skill,
            name: 'JavaScript',
        };

        repository.findById.mockResolvedValue(skill);
        repository.findByName.mockResolvedValue(undefined);
        repository.update.mockResolvedValue(updated);

        const input = {
            name: 'JavaScript',
            category: 'language',
        };

        expect(await service.update(1, input))
            .toEqual(updated);

        expect(repository.update)
            .toHaveBeenCalledWith(1, input);
    });

    it('rejects updating an unknown skill', async () => {
        repository.findById.mockResolvedValue(undefined);

        await expect(
            service.update(99, {
                name: 'JavaScript',
                category: 'language',
            })
        ).rejects.toThrow(NotFoundError);

        expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects a name already used by another skill', async () => {
        repository.findById.mockResolvedValue(skill);

        repository.findByName.mockResolvedValue({
            ...skill,
            id: 2,
        });

        await expect(
            service.update(1, {
                name: 'JavaScript',
                category: 'language',
            })
        ).rejects.toThrow(ConflictError);

        expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows retaining the existing name', async () => {
        repository.findById.mockResolvedValue(skill);
        repository.findByName.mockResolvedValue(skill);
        repository.update.mockResolvedValue(skill);

        await expect(
            service.update(1, {
                name: 'TypeScript',
                category: 'language',
            })
        ).resolves.toEqual(skill);
    });

    it('handles a skill disappearing during an update', async () => {
        repository.findById.mockResolvedValue(skill);
        repository.findByName.mockResolvedValue(undefined);
        repository.update.mockResolvedValue(undefined);

        await expect(
            service.update(1, {
                name: 'JavaScript',
                category: 'language',
            })
        ).rejects.toThrow(NotFoundError);
    });

    it('deletes an existing skill', async () => {
        repository.delete.mockResolvedValue(true);

        await expect(service.delete(1))
            .resolves.toBeUndefined();

        expect(repository.delete)
            .toHaveBeenCalledWith(1);
    });

    it('rejects deleting an unknown skill', async () => {
        repository.delete.mockResolvedValue(false);

        await expect(service.delete(99))
            .rejects.toThrow(NotFoundError);
    });
});