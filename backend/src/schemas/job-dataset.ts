import { z } from 'zod';

import { createJobSchema } from './job';

export const jobDatasetVersionSchema = z.literal(1);

export const jobDatasetSchema = z.object({
    version: jobDatasetVersionSchema,

    exportedAt: z.iso.datetime()
        .optional(),

    jobs: z.array(createJobSchema),
});

export type JobDataset = z.infer<typeof jobDatasetSchema>;