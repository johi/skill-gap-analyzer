/**
 * Normalize common job-advertisement deadline formats to YYYY-MM-DD.
 * Returns the original string for unknown formats so Zod can reject it.
 */
export function normalizeJobApplicationDeadline(value: unknown): unknown {
    if (value === null || typeof value !== 'string') return value;

    const input = value.trim();
    if (!input) return value;

    const validDate = (year: number, month: number, day: number): string | null => {
        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) ||
            year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // Canonical dates and timestamps with an explicit ISO date prefix.
    let match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(input);
    if (match) return validDate(Number(match[1]), Number(match[2]), Number(match[3])) ?? value;

    // Danish and other European numeric dates (day-first).
    match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(input);
    if (match) return validDate(Number(match[3]), Number(match[2]), Number(match[1])) ?? value;

    const months: Record<string, number> = {
        januar: 1, january: 1, februar: 2, february: 2, marts: 3, march: 3,
        april: 4, maj: 5, may: 5, juni: 6, june: 6, juli: 7, july: 7,
        august: 8, september: 9, oktober: 10, october: 10,
        november: 11, december: 12,
    };

    // E.g. "30. november 2026", "30 November 2026".
    match = /^(\d{1,2})\.?\s+([\p{L}]+)\s+(\d{4})$/iu.exec(input);
    if (match) {
        const month = months[match[2].toLocaleLowerCase('en-US')];
        if (month) return validDate(Number(match[3]), month, Number(match[1])) ?? value;
    }

    // E.g. "November 30, 2026".
    match = /^([\p{L}]+)\s+(\d{1,2}),?\s+(\d{4})$/iu.exec(input);
    if (match) {
        const month = months[match[1].toLocaleLowerCase('en-US')];
        if (month) return validDate(Number(match[3]), month, Number(match[2])) ?? value;
    }

    return value;
}
