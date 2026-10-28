import { describe, expect, it } from 'vitest';
import { paginateAnalysis } from '@/services/paginate-analysis';

const skills = Array.from({length: 27}, (_, skillId) => ({
    skillId: skillId + 1,
    name: `Skill ${String(skillId).padStart(2, '0')}`,
    jobCount: skillId % 3,
}));
const query = { search: '', page: 1, pageSize: 10, sortBy: 'name', sortOrder: 'asc' as const };

describe('Analysis result pagination', () => {
    it('searches before slicing and retains the source result', () => {
        const result = {totalJobsAnalyzed: 12, skills, missingInformation:['skill_assessments']};
        const page = paginateAnalysis(result, {...query, search:'sKiLl 0', page:2});
        expect(page.pagination).toEqual({page:1,pageSize:10,totalItems:10,totalPages:1});
        expect(page.skills).toHaveLength(10);
        expect(page.totalJobsAnalyzed).toBe(12);
        expect(page.missingInformation).toEqual(['skill_assessments']);
        expect(result.skills).toHaveLength(27);
    });
    it('sorts before pagination and keeps stable tie breakers', () => {
        const first = paginateAnalysis({skills}, {...query, sortBy:'jobCount', sortOrder:'desc'});
        const second = paginateAnalysis({skills}, {...query, sortBy:'jobCount', sortOrder:'desc', page:2});
        expect(first.pagination.totalItems).toBe(27);
        const ordered = [...first.skills, ...second.skills].map(skill => skill.skillId);
        expect(new Set(ordered).size).toBe(20);
        expect([...first.skills, ...second.skills].map(skill => skill.jobCount)).toEqual(
            [...first.skills, ...second.skills].map(skill => skill.jobCount).sort((a,b)=>b-a)
        );
    });
    it('handles out-of-range pages and empty results', () => {
        const last = paginateAnalysis({skills}, {...query, page:100, pageSize:25});
        expect(last.pagination.page).toBe(2);
        expect(last.skills).toHaveLength(2);
        const empty = paginateAnalysis({skills}, {...query,search:'unmatched',page:100});
        expect(empty.pagination).toEqual({page:1,pageSize:10,totalItems:0,totalPages:0});
    });
});
