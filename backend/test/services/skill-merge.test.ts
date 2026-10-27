import { describe, expect, it, vi } from 'vitest';
import { mergeSkillsSchema } from '@/schemas/skill';
import { SkillService } from '@/services/skill-service';
import type { SkillRepository } from '@/repositories/skill-repository';

function createService(merge: ReturnType<typeof vi.fn>) {
    return new SkillService({ merge } as unknown as SkillRepository);
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
    });

    it('rejects merging a skill into itself', async () => {
        const merge = vi.fn();
        await expect(createService(merge).merge([1, 2], 2)).rejects.toThrow();
        expect(merge).not.toHaveBeenCalled();
    });

    it('propagates repository failures', async () => {
        const merge = vi.fn().mockRejectedValue(new Error('database failure'));
        await expect(createService(merge).merge([1], 2)).rejects.toThrow('database failure');
    });
});
