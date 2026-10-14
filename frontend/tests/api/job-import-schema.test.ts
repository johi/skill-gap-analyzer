import { describe, expect, it } from 'vitest';

import {
    importedJobSchema,
    jobDatasetSchema,
    reviewedImportSchema,
    jobImportCommitResponseSchema,
} from '@/schemas/job-import';

const validJob = {
    dateFound: '2026-10-14',
    company: 'Example Company',
    title: 'Senior Backend Developer',
    languageRequirements: [
        { language: 'en', requirement: 'required' },
    ],
    skills: [
        {
            name: 'TypeScript',
            category: 'Programming',
            requirement: 'must_have',
        },
    ],
};

describe('UC-34: Job dataset validation', () => {
    it('accepts a valid version 1 dataset', () => {
        expect(jobDatasetSchema.safeParse({
            version: 1,
            jobs: [validJob],
        }).success).toBe(true);
    });

    it('rejects an unsupported dataset version', () => {
        expect(jobDatasetSchema.safeParse({
            version: 2,
            jobs: [validJob],
        }).success).toBe(false);
    });

    it('rejects a dataset without jobs', () => {
        expect(jobDatasetSchema.safeParse({
            version: 1,
        }).success).toBe(false);
    });

    it('accepts an empty dataset', () => {
        expect(jobDatasetSchema.safeParse({
            version: 1,
            jobs: [],
        }).success).toBe(true);
    });

    it('rejects an invalid job date', () => {
        expect(importedJobSchema.safeParse({
            ...validJob,
            dateFound: '2026-02-30',
        }).success).toBe(false);
    });

    it('rejects an empty company name', () => {
        expect(importedJobSchema.safeParse({
            ...validJob,
            company: '   ',
        }).success).toBe(false);
    });

    it('rejects an interest percentage above 100', () => {
        expect(importedJobSchema.safeParse({
            ...validJob,
            interest: 101,
        }).success).toBe(false);
    });

    it('rejects duplicate language requirements', () => {
        expect(importedJobSchema.safeParse({
            ...validJob,
            languageRequirements: [
                { language: 'en', requirement: 'required' },
                { language: 'en', requirement: 'preferred' },
            ],
        }).success).toBe(false);
    });

    it('defaults omitted skills and languages to empty arrays', () => {
        const result = importedJobSchema.parse({
            dateFound: '2026-10-14',
            company: 'Example Company',
            title: 'Backend Developer',
        });

        expect(result.skills).toEqual([]);
        expect(result.languageRequirements).toEqual([]);
    });

    it('trims company and skill names', () => {
        const result = importedJobSchema.parse({
            ...validJob,
            company: '  Example Company  ',
            skills: [
                {
                    name: '  TypeScript  ',
                    category: '  Programming  ',
                    requirement: 'must_have',
                },
            ],
        });

        expect(result.company).toBe('Example Company');
        expect(result.skills[0]?.name).toBe('TypeScript');
        expect(result.skills[0]?.category).toBe('Programming');
    });
});

describe('UC-35: Reviewed import validation', () => {
    it('accepts included and excluded jobs', () => {
        expect(reviewedImportSchema.safeParse({
            version: 1,
            jobs: [
                { jobIndex: 0, excluded: false, job: validJob },
                { jobIndex: 1, excluded: true, job: validJob },
            ],
        }).success).toBe(true);
    });

    it('rejects a negative job index', () => {
        expect(reviewedImportSchema.safeParse({
            version: 1,
            jobs: [
                { jobIndex: -1, excluded: false, job: validJob },
            ],
        }).success).toBe(false);
    });

    it('rejects a non-boolean exclusion decision', () => {
        expect(reviewedImportSchema.safeParse({
            version: 1,
            jobs: [
                { jobIndex: 0, excluded: 'no', job: validJob },
            ],
        }).success).toBe(false);
    });

    it('accepts a valid commit response', () => {
        const result = jobImportCommitResponseSchema.parse({
            imported: 2,
            excluded: 1,
            jobIds: [101, 102],
        });

        expect(result.imported).toBe(2);
        expect(result.excluded).toBe(1);
        expect(result.jobIds).toEqual([101, 102]);
    });

    it('rejects invalid imported job IDs', () => {
        expect(jobImportCommitResponseSchema.safeParse({
            imported: 1,
            excluded: 0,
            jobIds: [-5],
        }).success).toBe(false);
    });
});
