
import { describe, expect, it } from 'vitest';

import {
    JobMatchService,
    type JobMatchSkill,
    type JobMatchAssessment,
} from '@/services/job-match-service';

describe('JobMatchService', () => {
    const service = new JobMatchService();

    const php: JobMatchSkill = {
        id: 1,
        name: 'PHP',
        category: 'Programming Languages',
        requirement: 'must_have',
    };

    const docker: JobMatchSkill = {
        id: 2,
        name: 'Docker',
        category: 'DevOps',
        requirement: 'must_have',
    };

    const postgres: JobMatchSkill = {
        id: 3,
        name: 'PostgreSQL',
        category: 'Databases',
        requirement: 'nice_to_have',
    };

    function assess(
        skillId: number,
        level: number
    ): JobMatchAssessment {
        return { skillId, level };
    }

    it('returns 100% when all requirements are satisfied', () => {
        const result = service.calculate(
            [php, docker, postgres],
            [
                assess(1, 5),
                assess(2, 4),
                assess(3, 5),
            ]
        );

        expect(result.matchPercentage).toBe(100);
        expect(result.assessmentCoverage).toBe(100);
        expect(result.assessedSkills).toBe(3);
        expect(result.missingInformation).toEqual([]);
    });

    it('calculates weighted partial matches', () => {
        const result = service.calculate(
            [php, docker, postgres],
            [
                assess(1, 4),
                assess(2, 2),
                assess(3, 0),
            ]
        );

        // PHP:        2 * 1.00 = 2
        // Docker:     2 * 0.50 = 1
        // PostgreSQL: 1 * 0.00 = 0
        //
        // Total weight = 5
        // Match = (3 / 5) * 100 = 60%

        expect(result.matchPercentage).toBe(60);
        expect(result.assessmentCoverage).toBe(100);
    });

    it('excludes unassessed skills from the match score', () => {
        const result = service.calculate(
            [php, docker],
            [assess(1, 5)]
        );

        expect(result.matchPercentage).toBe(100);
        expect(result.assessmentCoverage).toBe(50);
        expect(result.assessedSkills).toBe(1);

        expect(result.missingInformation)
            .toContain('skill_assessments');
    });

    it('weights assessment coverage by requirement importance', () => {
        const result = service.calculate(
            [php, postgres],
            [assess(1, 4)]
        );

        // PHP weight = 2
        // PostgreSQL weight = 1
        // Coverage = 2 / 3 = 66.7%

        expect(result.assessmentCoverage).toBe(66.7);
        expect(result.matchPercentage).toBe(100);
    });

    it('treats proficiency zero as assessed', () => {
        const result = service.calculate(
            [php],
            [assess(1, 0)]
        );

        expect(result.matchPercentage).toBe(0);
        expect(result.assessmentCoverage).toBe(100);
        expect(result.assessedSkills).toBe(1);
        expect(result.skills[0]).toMatchObject({
            proficiency: 0,
            matchFactor: 0,
            status: 'assessed',
        });
    });

    it('returns null when no skills are assessed', () => {
        const result = service.calculate(
            [php, docker],
            []
        );

        expect(result.matchPercentage).toBeNull();
        expect(result.assessmentCoverage).toBe(0);
        expect(result.assessedSkills).toBe(0);

        expect(result.skills.every(
            (skill) => skill.status === 'unassessed'
        )).toBe(true);

        expect(result.missingInformation)
            .toContain('skill_assessments');
    });

    it('handles jobs without skill requirements', () => {
        const result = service.calculate([], []);

        expect(result).toEqual({
            matchPercentage: null,
            assessmentCoverage: 0,
            totalSkills: 0,
            assessedSkills: 0,
            skills: [],
            missingInformation: ['job_skills'],
        });
    });

    it('caps the match factor at 100%', () => {
        const result = service.calculate(
            [php],
            [assess(1, 5)]
        );

        expect(result.skills[0]!.matchFactor).toBe(1);
        expect(result.matchPercentage).toBe(100);
    });

    it('ignores assessments unrelated to the job', () => {
        const result = service.calculate(
            [php],
            [
                assess(1, 2),
                assess(999, 5),
            ]
        );

        expect(result.matchPercentage).toBe(50);
        expect(result.assessmentCoverage).toBe(100);
        expect(result.assessedSkills).toBe(1);
        expect(result.totalSkills).toBe(1);
    });

    it('rounds match percentages to one decimal', () => {
        const result = service.calculate(
            [php, docker, postgres],
            [
                assess(1, 4),
                assess(2, 4),
                assess(3, 1),
            ]
        );

        // (2 + 2 + 0.25) / 5 * 100 = 85%

        expect(result.matchPercentage).toBe(85);
    });

    it('preserves skill information in the result', () => {
        const result = service.calculate(
            [php, docker],
            [assess(1, 3)]
        );

        expect(result.skills).toEqual([
            {
                ...php,
                proficiency: 3,
                matchFactor: 0.75,
                status: 'assessed',
            },
            {
                ...docker,
                proficiency: null,
                matchFactor: null,
                status: 'unassessed',
            },
        ]);
    });
});
