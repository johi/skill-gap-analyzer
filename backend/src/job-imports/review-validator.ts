
import {
    JobImportAnalysis,
    ReviewedImport,
} from '@/schemas/job-dataset';

import { ValidationError } from '@/errors/application-errors';

export class JobImportReviewValidator {
    validate(
        analysis: JobImportAnalysis,
        reviewedImport: ReviewedImport
    ): void {
        if (reviewedImport.version !== analysis.version) {
            throw new ValidationError(
                'Reviewed import version does not match analyzed import version'
            );
        }

        if (
            reviewedImport.jobs.length !==
            analysis.jobs.length
        ) {
            throw new ValidationError(
                'Reviewed import must contain exactly one decision for every analyzed job'
            );
        }

        const reviewedIndices = new Set(reviewedImport.jobs.map(job => job.jobIndex));
        for (let jobIndex = 0; jobIndex < analysis.jobs.length; jobIndex++) {
            if (!reviewedIndices.has(jobIndex)) {
                throw new ValidationError(
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
                    skill.name.toLowerCase();

                const previousRequirement =
                    requirementsBySkill.get(canonicalKey);

                if (previousRequirement !== undefined) {
                    if (
                        previousRequirement !==
                        skill.requirement
                    ) {
                        throw new ValidationError(
                            `Job index ${reviewedJob.jobIndex} contains unresolved skill conflicts`
                        );
                    }

                    throw new ValidationError(
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
