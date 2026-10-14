import {
    JobImportAnalysis,
    ReviewedImport,
} from '@/schemas/job-dataset';

export class JobImportReviewService {
    validate(
        analysis: JobImportAnalysis,
        reviewedImport: ReviewedImport
    ): void {
        if (reviewedImport.version !== analysis.version) {
            throw new Error(
                'Reviewed import version does not match analyzed import version'
            );
        }

        if (
            reviewedImport.jobs.length !==
            analysis.jobs.length
        ) {
            throw new Error(
                'Reviewed import must contain exactly one decision for every analyzed job'
            );
        }

        for (
            let jobIndex = 0;
            jobIndex < analysis.jobs.length;
            jobIndex++
        ) {
            const reviewedJob = reviewedImport.jobs.find(
                (job) => job.jobIndex === jobIndex
            );

            if (!reviewedJob) {
                throw new Error(
                    `Missing review decision for job index ${jobIndex}`
                );
            }
        }

        for (const reviewedJob of reviewedImport.jobs) {
            if (reviewedJob.excluded) {
                continue;
            }

            const requirementsBySkill =
                new Map<string, string>();

            for (const skill of reviewedJob.job.skills) {
                const canonicalKey =
                    skill.name.trim().toLowerCase();

                const previousRequirement =
                    requirementsBySkill.get(canonicalKey);

                if (previousRequirement !== undefined) {
                    if (
                        previousRequirement !==
                        skill.requirement
                    ) {
                        throw new Error(
                            `Job index ${reviewedJob.jobIndex} contains unresolved skill conflicts`
                        );
                    }

                    throw new Error(
                        `Job index ${reviewedJob.jobIndex} contains duplicate canonical skills`
                    );
                }

                requirementsBySkill.set(
                    canonicalKey,
                    skill.requirement
                );
            }
        }
    }
}