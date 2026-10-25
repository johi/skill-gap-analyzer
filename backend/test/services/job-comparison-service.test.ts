import { describe, expect, it } from 'vitest';
import { JobComparisonService } from '@/services/job-comparison-service';
import { JobMatchService } from '@/services/job-match-service';
import { listJobsQuerySchema } from '@/schemas/job';
import type { JobRepository } from '@/repositories/job-repository';
import type { UserSkillRepository } from '@/repositories/user-skill-repository';

const skill = (id: number, requirement: 'must_have' | 'nice_to_have' = 'must_have') => ({
    id, name: `Skill ${id}`, category: 'Programming Languages', requirement,
});
const job = (id: number, company: string, skills: ReturnType<typeof skill>[], workModel: 'remote' | 'hybrid' = 'remote') => ({
    id, company, title: 'Developer', location: 'Copenhagen', workModel, skills,
    dateFound: '2026-10-20', interest: null, originalMatch: null,
});
const jobs = [
    job(1, 'Alpha', [skill(1), skill(2)]),
    job(2, 'Beta', [skill(1)]),
    job(3, 'Gamma', [skill(2)]),
    job(4, 'Delta', []),
    job(5, 'Epsilon', [skill(3)], 'hybrid'),
];
function setup() {
    const repository = { findAll: async () => jobs } as unknown as JobRepository;
    const assessments = { findAll: async () => [
        { skillId: 1, level: 4 }, { skillId: 2, level: 2 },
    ] } as unknown as UserSkillRepository;
    return new JobComparisonService(assessments, new JobMatchService(), repository);
}
const query = (options: Record<string, unknown> = {}) => listJobsQuerySchema.parse(options);

describe('JobComparisonService', () => {
    it('calculates all matches and preserves unassessed results', async () => {
        const result = await setup().list(query());
        expect(result.data.find(j => j.id === 1)).toMatchObject({ matchPercentage: 75, assessmentCoverage: 100 });
        expect(result.data.find(j => j.id === 2)).toMatchObject({ matchPercentage: 100, assessmentCoverage: 100 });
        expect(result.data.find(j => j.id === 5)).toMatchObject({ matchPercentage: null, assessmentCoverage: 0 });
        expect(result.data.find(j => j.id === 4)).toMatchObject({ matchPercentage: null, assessmentCoverage: 0 });
    });
    it('sorts globally before pagination with nulls last in both directions', async () => {
        const descending = await setup().list(query({ sortBy: 'matchPercentage', pageSize: 10 }));
        expect(descending.data.map(j => j.id)).toEqual([2, 1, 3, 5, 4]);
        const ascending = await setup().list(query({ sortBy: 'matchPercentage', sortOrder: 'asc', pageSize: 10 }));
        expect(ascending.data.map(j => j.id)).toEqual([3, 1, 2, 5, 4]);
    });
    it('filters and paginates the complete sorted result', async () => {
        const result = await setup().list(query({ workModel: 'remote', sortBy: 'matchPercentage', pageSize: 10 }));
        expect(result.data.map(j => j.id)).toEqual([2, 1, 3, 4]);
        expect(result.pagination.totalItems).toBe(4);
    });
    it('returns an empty page for no matches', async () => {
        const result = await setup().list(query({ search: 'unfindable' }));
        expect(result.data).toEqual([]);
        expect(result.pagination.totalItems).toBe(0);
    });
});
