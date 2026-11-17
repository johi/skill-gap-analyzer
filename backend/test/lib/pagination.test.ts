import { describe, expect, it } from 'vitest';
import { pagination } from '@/lib/pagination';

describe('pagination', () => {
    it('returns metadata for a requested page', () => {
        expect(pagination(2, 10, 27)).toEqual({
            page: 2, pageSize: 10, totalItems: 27, totalPages: 3,
        });
    });

    it('clamps out-of-range pages to the last page', () => {
        expect(pagination(100, 25, 27)).toEqual({
            page: 2, pageSize: 25, totalItems: 27, totalPages: 2,
        });
    });

    it('uses page one when there are no results', () => {
        expect(pagination(100, 10, 0)).toEqual({
            page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
        });
    });
});
