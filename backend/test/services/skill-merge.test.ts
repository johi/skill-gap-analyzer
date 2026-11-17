import { describe, expect, it, vi } from 'vitest';
import { mergeSkillsSchema } from '@/schemas/skill';
import { SkillService } from '@/services/skill-service';
import { SkillRepository } from '@/repositories/skill-repository';
import type { Database } from '@/repositories/types';

const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({}));

function createService(merge: SkillRepository['merge']) {
    vi.spyOn(SkillRepository.prototype, 'merge').mockImplementation(merge);
    transaction.mockClear();
    return new SkillService({} as SkillRepository, { transaction } as unknown as Pick<Database, 'transaction'>);
}

describe('Merge skills service and validation', () => {
    it('accepts multiple distinct sources', () => {
        expect(mergeSkillsSchema.parse({ sourceIds: [1, 2], targetId: 3 }))
            .toEqual({ sourceIds: [1, 2], targetId: 3 });
    });

    it.each([
        { sourceIds: [], targetId: 3 },
        { sourceIds: [1, 1], targetId: 3 },
        { sourceIds: [1], targetId: 1 },
        { sourceIds: [-1], targetId: 3 },
        { sourceIds: [1], targetId: 0 },
    ])('rejects invalid request data: %j', input => {
        expect(mergeSkillsSchema.safeParse(input).success).toBe(false);
    });

    it('delegates selected skills without changing IDs', async () => {
        const merge = vi.fn().mockResolvedValue(undefined);
        await createService(merge).merge([1, 2], 3);
        expect(merge).toHaveBeenCalledExactlyOnceWith([1, 2], 3);
        expect(transaction).toHaveBeenCalledOnce();
    });

    it('rejects merging a skill into itself', async () => {
        const merge = vi.fn();
        await expect(createService(merge).merge([1, 2], 2)).rejects.toThrow();
        expect(merge).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
    });

    it('propagates repository failures', async () => {
        const merge = vi.fn().mockRejectedValue(new Error('database failure'));
        await expect(createService(merge).merge([1], 2)).rejects.toThrow('database failure');
    });
});
