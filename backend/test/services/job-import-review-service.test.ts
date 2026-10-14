import {
    describe,
    expect,
    it,
} from 'vitest';

import { JobImportReviewService } from '@/services/job-import-review-service';
import {
    JobImportAnalysis,
    ReviewedImport,
} from '@/schemas/job-dataset';

describe('JobImportReviewService', () => {
    const service = new JobImportReviewService();

    const analysis: JobImportAnalysis = {
        version: 1,
        totalJobs: 2,
        requiresReview: false,
        jobs: [
            {
                job: {
                    dateFound: '2026-10-05',
                    company: 'Example Company',
                    title: 'Senior Backend Developer',
                    languageRequirements: [],
                    skills: [],
                },
                skills: [],
            },
            {
                job: {
                    dateFound: '2026-10-06',
                    company: 'Another Company',
                    title: 'Backend Developer',
                    languageRequirements: [],
                    skills: [],
                },
                skills: [],
            },
        ],
    };

    const createReviewedImport = (): ReviewedImport => ({
        version: 1,
        jobs: [
            {
                jobIndex: 0,
                excluded: false,
                job: analysis.jobs[0].job,
            },
            {
                jobIndex: 1,
                excluded: false,
                job: analysis.jobs[1].job,
            },
        ],
    });

    const createConflictingAnalysis = (): JobImportAnalysis => ({
        ...analysis,
        requiresReview: true,
        jobs: [
            {
                ...analysis.jobs[0],
                skills: [
                    {
                        name: 'Fastify',
                        category: 'framework',
                        requirement: 'must_have',
                        resolution: 'review_required',
                        canonicalSkillId: null,
                        canonicalName: 'Fastify',
                        conflictingRequirements: [
                            'must_have',
                            'nice_to_have',
                        ],
                    },
                ],
            },
            analysis.jobs[1],
        ],
    });

    it('accepts exactly one review decision for every analyzed job', () => {
        expect(() =>
            service.validate(
                analysis,
                createReviewedImport()
            )
        ).not.toThrow();
    });

    // it('rejects a reviewed job that replaces the original company', () => {
    //     const reviewedImport = createReviewedImport();
    //
    //     reviewedImport.jobs[0].job = {
    //         ...reviewedImport.jobs[0].job,
    //         company: 'Completely Different Company',
    //     };
    //
    //     expect(() =>
    //         service.validate(
    //             analysis,
    //             reviewedImport
    //         )
    //     ).toThrow(
    //         'Job index 0 does not match the original company'
    //     );
    // });

    it('rejects a missing review decision', () => {
        const reviewedImport = createReviewedImport();

        reviewedImport.jobs.pop();

        expect(() =>
            service.validate(
                analysis,
                reviewedImport
            )
        ).toThrow(
            'Reviewed import must contain exactly one decision for every analyzed job'
        );
    });

    it('rejects an unknown job index', () => {
        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[1].jobIndex = 2;

        expect(() =>
            service.validate(
                analysis,
                reviewedImport
            )
        ).toThrow(
            'Missing review decision for job index 1'
        );
    });

    it('rejects a reviewed import with a different version', () => {
        const reviewedImport = {
            ...createReviewedImport(),
            version: 2,
        };

        expect(() =>
            service.validate(
                analysis,
                reviewedImport as unknown as ReviewedImport
            )
        ).toThrow(
            'Reviewed import version does not match analyzed import version'
        );
    });

    it('accepts an included job with corrected skill conflicts', () => {
        const conflictingAnalysis =
            createConflictingAnalysis();

        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[0].job.skills = [
            {
                name: 'Fastify',
                category: 'framework',
                requirement: 'must_have',
            },
        ];

        expect(() =>
            service.validate(
                conflictingAnalysis,
                reviewedImport
            )
        ).not.toThrow();
    });

    it('accepts an included job with conflicting skills removed', () => {
        const conflictingAnalysis =
            createConflictingAnalysis();

        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[0].job.skills = [];

        expect(() =>
            service.validate(
                conflictingAnalysis,
                reviewedImport
            )
        ).not.toThrow();
    });

    it('rejects an included job with unresolved skill conflicts', () => {
        const conflictingAnalysis =
            createConflictingAnalysis();

        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[0].job.skills = [
            {
                name: 'Fastify',
                category: 'framework',
                requirement: 'must_have',
            },
            {
                name: 'fastify',
                category: 'framework',
                requirement: 'nice_to_have',
            },
        ];

        expect(() =>
            service.validate(
                conflictingAnalysis,
                reviewedImport
            )
        ).toThrow(
            'Job index 0 contains unresolved skill conflicts'
        );
    });

    it('rejects duplicate canonical skills with identical requirements', () => {
        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[0].job.skills = [
            {
                name: 'PostgreSQL',
                category: 'database',
                requirement: 'must_have',
            },
            {
                name: 'postgresql',
                category: 'database',
                requirement: 'must_have',
            },
        ];

        expect(() =>
            service.validate(
                analysis,
                reviewedImport
            )
        ).toThrow(
            'Job index 0 contains duplicate canonical skills'
        );
    });

    it('rejects new skill conflicts introduced during review', () => {
        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[0].job.skills = [
            {
                name: 'PostgreSQL',
                category: 'database',
                requirement: 'must_have',
            },
            {
                name: 'postgresql',
                category: 'database',
                requirement: 'nice_to_have',
            },
        ];

        expect(() =>
            service.validate(
                analysis,
                reviewedImport
            )
        ).toThrow(
            'Job index 0 contains unresolved skill conflicts'
        );
    });

    it('accepts an excluded job with unresolved skill conflicts', () => {
        const conflictingAnalysis =
            createConflictingAnalysis();

        const reviewedImport = createReviewedImport();

        reviewedImport.jobs[0].excluded = true;

        expect(() =>
            service.validate(
                conflictingAnalysis,
                reviewedImport
            )
        ).not.toThrow();
    });
});