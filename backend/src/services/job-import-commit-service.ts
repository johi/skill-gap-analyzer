import { db } from '@/db';
import { jobs } from '@/db/schema';

import { JobService } from '@/services/job-service';
import { JobImportService } from '@/services/job-import-service';
import { JobImportReviewService } from '@/services/job-import-review-service';

import { SkillRepository } from '@/repositories/skill-repository';

import {
    JobDataset,
    ReviewedImport,
    jobDatasetSchema,
    reviewedImportSchema,
} from '@/schemas/job-dataset';

export class JobImportCommitService {
    constructor(
        private readonly jobService = new JobService(),
        private readonly reviewService =
        new JobImportReviewService()
    ) {}

    async commit(
        dataset: JobDataset,
        reviewedImport: ReviewedImport,
        replaceExisting = false
    ): Promise<{
        imported: number;
        excluded: number;
        jobIds: number[];
    }> {
        // Validate both payloads before starting a transaction.
        const validatedDataset =
            jobDatasetSchema.parse(dataset);

        const validatedReview =
            reviewedImportSchema.parse(reviewedImport);

        return db.transaction(async (tx) => {
            const skillRepository = new SkillRepository(tx);

            const importService = new JobImportService(
                skillRepository
            );

            // Re-analyze the original dataset server-side.
            const analysis = await importService.analyze(
                validatedDataset
            );

            this.reviewService.validate(
                analysis,
                validatedReview
            );

            if (replaceExisting) {
                // Cascades to job_skills and job_language_requirements only.
                // The skills catalogue and user assessments remain untouched.
                await tx.delete(jobs);
            }

            const jobIds: number[] = [];
            let excluded = 0;

            for (const reviewedJob of validatedReview.jobs) {
                if (reviewedJob.excluded) {
                    excluded++;
                    continue;
                }

                const created =
                    await this.jobService.createWithExecutor(
                        reviewedJob.job,
                        tx
                    );

                jobIds.push(created.id);
            }

            return {
                imported: jobIds.length,
                excluded,
                jobIds,
            };
        });
    }
}