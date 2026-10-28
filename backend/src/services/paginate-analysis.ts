import type { ListPaginationQuery } from '@/schemas/list-pagination';
import { pagination } from '@/schemas/list-pagination';

export function paginateAnalysis<
    R extends { skills: Array<{ skillId: number; name: string }> },
>(result: R, query: ListPaginationQuery) {
    const filtered = result.skills.filter(skill => skill.name.toLocaleLowerCase().includes(query.search.toLocaleLowerCase()));
    const sorted = [...filtered].sort((a, b) => {
        const left = (a as Record<string, unknown>)[query.sortBy];
        const right = (b as Record<string, unknown>)[query.sortBy];
        if (left == null && right != null) return 1;
        if (right == null && left != null) return -1;
        const comparison = left == null ? 0
            : typeof left === 'number' && typeof right === 'number' ? left - right
            : String(left).localeCompare(String(right));
        return (comparison ? (query.sortOrder === 'desc' ? -comparison : comparison) : 0)
            || a.name.localeCompare(b.name) || a.skillId - b.skillId;
    });
    const meta = pagination(query.page, query.pageSize, sorted.length);
    return { ...result, skills: sorted.slice((meta.page - 1) * meta.pageSize, meta.page * meta.pageSize), pagination: meta };
}
