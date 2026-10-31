/** Find the first object of a given JSON-LD type in each parseable script. */
export function* findJsonLdObjectsByType(
    html: string,
    typeName: string
): Generator<Record<string, unknown>> {
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
        if (!/\btype\s*=\s*(?:["']application\/ld\+json["']|application\/ld\+json(?:\s|$))/i.test(match[1] ?? '')) {
            continue;
        }

        try {
            const object = findObjectByType(JSON.parse(match[2] ?? ''), typeName);
            if (object) yield object;
        } catch {
            // Invalid JSON-LD should not prevent checking subsequent scripts.
        }
    }
}

/** Search JSON-LD arrays and @graph containers for the first matching object. */
function findObjectByType(value: unknown, typeName: string): Record<string, unknown> | null {
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findObjectByType(item, typeName);
            if (found) return found;
        }
        return null;
    }
    if (value === null || typeof value !== 'object') return null;

    const object = value as Record<string, unknown>;
    const type = object['@type'];
    if (type === typeName ||
        (Array.isArray(type) && type.includes(typeName)) ||
        (typeof type === 'string' && type.endsWith(`/${typeName}`))) {
        return object;
    }
    return findObjectByType(object['@graph'], typeName);
}
