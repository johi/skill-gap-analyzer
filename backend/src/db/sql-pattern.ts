/** Escapes SQL LIKE/ILIKE metacharacters for literal matching (backslash escape). */
export function escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}

/** Builds a SQL LIKE/ILIKE substring pattern from a literal search value. */
export function containsLikePattern(value: string): string {
    return `%${escapeLikePattern(value)}%`;
}
