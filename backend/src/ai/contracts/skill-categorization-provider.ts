/** Provider-independent contract for skill categorization. */
export interface SkillCategorizationProvider {
    categorize(skills: string[], existingCategories: string[], advertisement: string): Promise<unknown>;
}
