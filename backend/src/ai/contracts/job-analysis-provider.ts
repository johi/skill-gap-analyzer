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
