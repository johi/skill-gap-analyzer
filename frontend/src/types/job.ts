export type {
    ApplicationStatus,
    JobLanguageRequirement,
    LanguageRequirement,
    EmploymentType,
    Job,
    JobSkill,
    JobSkillRequirement,
    JobWithSkills,
    Seniority,
    WorkModel,
} from '@/schemas/job';

import type {
    ApplicationStatus,
    JobLanguageRequirement,
    EmploymentType,
    JobSkillRequirement,
    Seniority,
    WorkModel,
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
    workModel: WorkModel | null;
    employmentType: EmploymentType | null;
    seniority: Seniority | null;
    primaryRole: string | null;
    yearsRequired: string | null;
    educationRequirement: string | null;
    languageRequirements: JobLanguageRequirement[];
    salaryRate: string | null;
    interest: number | null;
    applyStatus: ApplicationStatus | null;
    gapNotes: string | null;
    originalMatch: number | null;
    skills: JobSkillInput[];
}