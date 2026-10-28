/** Provider-independent contract for job advertisement extraction. */
export interface JobAnalysisProvider {
    analyze(advertisement: string): Promise<unknown>;
    categorize(skills: string[], existingCategories: string[], advertisement: string): Promise<unknown>;
    /** Optional provider correction of a rejected structured extraction. */
    correctAnalysis?(advertisement: string, previous: unknown, issues: AnalysisValidationIssue[]): Promise<unknown>;
}

export interface AnalysisValidationIssue {
    path: string;
    code: string;
}

// Structured Outputs requires all fields and additionalProperties: false.
// Null is used for facts that the advertisement does not establish.
const nullableString = { type: ['string', 'null'] };
const nullableEnum = (values: string[]) => ({
    type: ['string', 'null'],
    enum: [...values, null],
});

export const jobExtractionJsonSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        applicationDeadline: { type: ['string', 'null'], description: 'Application deadline as YYYY-MM-DD, or null when not established by the source' },
        contacts: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: nullableString, role: nullableString, email: nullableString, phone: nullableString }, required: ['name', 'role', 'email', 'phone'] } },
        company: nullableString,
        title: nullableString,
        location: nullableString,
        workModel: nullableEnum(['onsite', 'hybrid', 'remote']),
        employmentType: nullableEnum([
            'full_time', 'part_time', 'contract', 'temporary',
        ]),
        seniority: nullableEnum([
            'junior', 'mid', 'senior', 'lead', 'staff', 'principal',
        ]),
        primaryRole: nullableString,
        yearsRequired: nullableString,
        educationRequirement: nullableString,
        languageRequirements: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    language: { type: 'string' },
                    requirement: {
                        type: 'string',
                        enum: ['preferred', 'required'],
                    },
                },
                required: ['language', 'requirement'],
            },
        },
        salaryRate: nullableString,
        skills: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    name: { type: 'string' },
                    category: nullableString,
                    requirement: nullableEnum(['must_have', 'nice_to_have']),
                },
                required: ['name', 'category', 'requirement'],
            },
        },
    },
    required: [
        'applicationDeadline', 'contacts', 'company', 'title', 'location', 'workModel', 'employmentType',
        'seniority', 'primaryRole', 'yearsRequired', 'educationRequirement',
        'languageRequirements', 'salaryRate', 'skills',
    ],
} as const;


/** Stage two: classify only the skills that are absent from the catalogue. */
export const skillCategorizationJsonSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        skills: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    name: { type: 'string' },
                    category: { type: 'string' },
                },
                required: ['name', 'category'],
            },
        },
    },
    required: ['skills'],
} as const;
