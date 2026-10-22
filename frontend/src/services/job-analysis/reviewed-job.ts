import { z } from 'zod';
import type { JobAdvertisementAnalysis } from '@/schemas/job-analysis';
import {
  applicationStatusSchema,
  employmentTypeSchema,
  jobSkillRequirementSchema,
  languageRequirementSchema,
  senioritySchema,
  workModelSchema,
} from '@/schemas/job';
import type { CreateJobInput, JobSkillRequirement } from '@/types/job';

export type JobReviewDraft = Omit<CreateJobInput, 'skills'> & {
  skills: Array<{ name: string; category: string; requirement: JobSkillRequirement | null }>;
};

/** Convert an AI proposal into a draft. This function never writes data. */
export function analysisToReviewInput(analysis: JobAdvertisementAnalysis): JobReviewDraft {
  return {
    dateFound: analysis.dateFound,
    company: analysis.proposal.company ?? '',
    title: analysis.proposal.title ?? '',
    sourceUrl: null,
    originalText: analysis.originalText,
    location: analysis.proposal.location,
    workModel: analysis.proposal.workModel,
    employmentType: analysis.proposal.employmentType,
    seniority: analysis.proposal.seniority,
    primaryRole: analysis.proposal.primaryRole,
    yearsRequired: analysis.proposal.yearsRequired,
    educationRequirement: analysis.proposal.educationRequirement,
    languageRequirements: analysis.proposal.languageRequirements.map(item => ({ ...item })),
    salaryRate: analysis.proposal.salaryRate,
    interest: null,
    applyStatus: null,
    gapNotes: null,
    originalMatch: null,
    // Preserve uncertainty. The reviewer must classify these before approval.
    skills: analysis.proposal.skills.map(skill => ({
      name: skill.name,
      category: skill.category ?? '',
      requirement: skill.requirement,
    })),
  };
}

const nullableText = (max: number) => z.string().trim().max(max).nullable();

/** Mirrors the backend's create-job contract, with duplicate detection before approval. */
export const reviewedJobInputSchema = z.object({
  dateFound: z.iso.date(),
  company: z.string().trim().min(1).max(255),
  title: z.string().trim().min(1).max(255),
  sourceUrl: z.url().nullable(),
  originalText: z.string().trim().min(1).nullable(),
  location: nullableText(255),
  workModel: workModelSchema.nullable(),
  employmentType: employmentTypeSchema.nullable(),
  seniority: senioritySchema.nullable(),
  primaryRole: nullableText(100),
  yearsRequired: nullableText(100),
  educationRequirement: nullableText(2000),
  languageRequirements: z.array(z.object({
    language: z.string().regex(/^[a-z]{2}$/),
    requirement: languageRequirementSchema,
  })),
  salaryRate: nullableText(1000),
  interest: z.number().int().min(0).max(100).nullable(),
  applyStatus: applicationStatusSchema.nullable(),
  gapNotes: z.string().nullable(),
  originalMatch: z.number().min(0).max(100).nullable(),
  skills: z.array(z.object({
    name: z.string().trim().min(1).max(255),
    category: z.string().trim().min(1).max(100),
    requirement: jobSkillRequirementSchema,
  })),
}).superRefine((job, context) => {
  const languages = new Set<string>();
  for (const [index, item] of job.languageRequirements.entries()) {
    if (languages.has(item.language)) {
      context.addIssue({ code: 'custom', path: ['languageRequirements', index], message: 'Duplicate language' });
    }
    languages.add(item.language);
  }
  const skills = new Set<string>();
  for (const [index, skill] of job.skills.entries()) {
    const key = skill.name.trim().toLocaleLowerCase('en');
    if (skills.has(key)) {
      context.addIssue({ code: 'custom', path: ['skills', index], message: `Duplicate skill: ${skill.name}` });
    }
    skills.add(key);
  }
});

export function validateReviewedAnalysis(input: CreateJobInput | JobReviewDraft): {
  valid: boolean;
  errors: string[];
  value: CreateJobInput | null;
} {
  const result = reviewedJobInputSchema.safeParse(input);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.') || 'Job'}: ${issue.message}`),
      value: null,
    };
  }
  return { valid: true, errors: [], value: result.data };
}
