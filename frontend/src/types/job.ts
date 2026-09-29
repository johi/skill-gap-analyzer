export interface Job {
    id: number;
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
    createdAt: string;
    updatedAt: string;
}

export type JobSkillRequirement =
    'must_have' |
    'nice_to_have';

export interface JobSkill {
    id: number;
    name: string;
    category: string;
    requirement: JobSkillRequirement;
}

export interface JobWithSkills extends Job {
    skills: JobSkill[];
}

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