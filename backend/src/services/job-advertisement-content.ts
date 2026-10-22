import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';

const MAX_ADVERTISEMENT_LENGTH = 30_000;
const MIN_ADVERTISEMENT_LENGTH = 50;

const namedEntities: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', bull: '•', rsquo: '’', lsquo: '‘',
    rdquo: '”', ldquo: '“', hellip: '…', aelig: 'æ', AElig: 'Æ',
    oslash: 'ø', Oslash: 'Ø', aring: 'å', Aring: 'Å',
    eacute: 'é', Eacute: 'É', uuml: 'ü', Uuml: 'Ü',
};

function decodeEntities(value: string): string {
    return value.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (entity, name: string) => {
        if (name.startsWith('#')) {
            const hex = name[1]?.toLowerCase() === 'x';
            const codePoint = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
            return codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
                ? String.fromCodePoint(codePoint) : entity;
        }
        return namedEntities[name] ?? namedEntities[name.toLowerCase()] ?? entity;
    });
}

function normalizeText(value: string): string {
    return decodeEntities(value)
        .replace(/\r\n?/g, '\n')
        .replace(/[\t\f\v ]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function htmlToText(html: string): string {
    return normalizeText(html
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(script|style|noscript|svg|nav|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<\/?(?:p|div|section|article|main|h[1-6]|li|ul|ol|tr|table|blockquote)\b[^>]*>/gi, '\n')
        .replace(/<[^>]*>/g, ' '));
}

function record(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown> : null;
}

function jobPostingFrom(value: unknown): Record<string, unknown> | null {
    if (Array.isArray(value)) {
        for (const item of value) {
            const posting = jobPostingFrom(item);
            if (posting) return posting;
        }
        return null;
    }
    const object = record(value);
    if (!object) return null;
    const type = object['@type'];
    if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting')) ||
        (typeof type === 'string' && type.endsWith('/JobPosting'))) {
        return object;
    }
    return jobPostingFrom(object['@graph']);
}

function locationText(value: unknown): string | null {
    if (Array.isArray(value)) return value.map(locationText).filter(Boolean).join(', ') || null;
    if (typeof value === 'string') return value;
    const obj = record(value);
    if (!obj) return null;
    const address = record(obj.address) ?? obj;
    const parts = [address.streetAddress, address.addressLocality, address.addressRegion, address.addressCountry]
        .filter((part): part is string => typeof part === 'string' && part.length > 0);
    return parts.join(', ') || null;
}

function extractJsonLd(html: string): string | null {
    const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
    for (const match of html.matchAll(scripts)) {
        if (!/\btype\s*=\s*(?:["']application\/ld\+json["']|application\/ld\+json(?:\s|$))/i.test(match[1] ?? '')) {
            continue;
        }
        try {
            const posting = jobPostingFrom(JSON.parse(match[2] ?? ''));
            if (!posting || typeof posting.description !== 'string') continue;
            const description = htmlToText(posting.description);
            if (description.length < MIN_ADVERTISEMENT_LENGTH) continue;
            const organization = record(posting.hiringOrganization);
            const details = [
                typeof posting.title === 'string' ? `Job title: ${posting.title}` : null,
                typeof organization?.name === 'string' ? `Company: ${organization.name}` : null,
                locationText(posting.jobLocation) ? `Location: ${locationText(posting.jobLocation)}` : null,
                typeof posting.employmentType === 'string' ? `Employment type: ${posting.employmentType}` : null,
            ].filter(Boolean);
            return normalizeText([...details, description].join('\n\n'));
        } catch {
            // Malformed JSON-LD is common. Try the next script or visible page text.
        }
    }
    return null;
}

/** Extract a reviewable advertisement from HTML or plain text; no AI or persistence. */
export function extractJobAdvertisement(body: string, contentType: string): string {
    const type = contentType.toLowerCase().split(';')[0]?.trim();
    if (type && !['text/html', 'application/xhtml+xml', 'text/plain'].includes(type)) {
        throw new JobAdvertisementRetrievalError('The URL does not return an HTML or text page. Paste the advertisement instead.');
    }

    const isHtml = type !== 'text/plain' && /<\s*(?:!doctype|html|head|body|main|article|div|p|script)\b/i.test(body);
    let text: string;
    if (!isHtml) {
        text = normalizeText(body);
    } else {
        const jsonLd = extractJsonLd(body);
        const main = body.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)
            ?? body.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i);
        const visible = htmlToText(main?.[1] ?? body.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1] ?? body);
        text = jsonLd ?? visible;
    }

    if (text.length < MIN_ADVERTISEMENT_LENGTH) {
        throw new JobAdvertisementRetrievalError('No readable job advertisement was found at this URL. Paste the advertisement instead.');
    }
    return text.slice(0, MAX_ADVERTISEMENT_LENGTH).trim();
}
