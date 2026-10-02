export type {
    Job,
    JobSkill,
    JobSkillRequirement,
    JobWithSkills,
} from '@/schemas/job';

import type {
    JobSkillRequirement,
} from '@/schemas/job';

export interface JobSkillInput {
    name: string;
    category: string;
    requirement: JobSkillRequirement;
}

export interface CreateJobInput {
    dateFound: string;
    company: string;
    title: string;
    sourceUrl: string | null;
    originalText: string | null;
    location: string | null;
    workModel: string | null;
    employmentType: string | null;
    seniority: string | null;
    primaryRole: string | null;
    yearsRequired: string | null;
    educationRequirement: string | null;
    danishRequired: string | null;
    salaryRate: string | null;
    interest: number | null;
    applyStatus: string | null;
    gapNotes: string | null;
    originalMatch: number | null;
    skills: JobSkillInput[];
}