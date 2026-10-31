import { findJsonLdObjectsByType } from '@/lib/json-ld';
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
    // JSON-LD descriptions can contain entity-encoded HTML (e.g. &lt;p&gt;).
    // Decode before stripping tags so encoded markup is handled as markup.
    const decodedHtml = decodeEntities(html);
    return normalizeText(decodedHtml
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(script|style|noscript|svg|nav|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<\/?(?:p|div|section|article|main|h[1-6]|li|ul|ol|tr|table|blockquote)\b[^>]*>/gi, '\n')
        .replace(/<[^>]*>/g, ' '));
}

function extractJsonLd(
    postings: Iterable<Record<string, unknown>>
): { advertisement: string; title: string | null } | null {
    for (const posting of postings) {
        try {
            if (typeof posting.description !== 'string') continue;

            const description = htmlToText(posting.description);
            if (description.length < MIN_ADVERTISEMENT_LENGTH) continue;

            // Preserve the actual advertised title as a heading when it is not already present.
            const title = typeof posting.title === 'string' ? htmlToText(posting.title) : '';
            return {
                title: title || null,
                advertisement: title && description.split('\n', 1)[0]?.trim() !== title
                    ? `${title}\n\n${description}`
                    : description,
            };
        } catch {
            // Malformed JSON-LD is common. Try the next script or visible page text.
        }
    }

    return null;
}

/** Extract a reviewable advertisement from HTML or plain text; no AI or persistence. */
export function extractJobAdvertisementDetails(
    body: string, contentType: string,
    postings?: Iterable<Record<string, unknown>>
): { advertisement: string; title: string | null } {
    const type = contentType.toLowerCase().split(';')[0]?.trim();

    if (type && !['text/html', 'application/xhtml+xml', 'text/plain'].includes(type)) {
        throw new JobAdvertisementRetrievalError(
            'The URL does not return an HTML or text page. Paste the advertisement instead.'
        );
    }

    const isHtml = type !== 'text/plain' &&
        /<\s*(?:!doctype|html|head|body|main|article|div|p|script)\b/i.test(body);

    let text: string;
    let title: string | null = null;

    if (!isHtml) {
        text = normalizeText(body);
    } else {
        const jsonLd = extractJsonLd(postings ?? findJsonLdObjectsByType(body, 'JobPosting'));
        const main = body.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)
            ?? body.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i);

        const visible = htmlToText(
            main?.[1] ??
            body.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1] ??
            body
        );

        text = jsonLd?.advertisement ?? visible;
        title = jsonLd?.title ?? null;
    }

    if (text.length < MIN_ADVERTISEMENT_LENGTH) {
        throw new JobAdvertisementRetrievalError(
            'No readable job advertisement was found at this URL. Paste the advertisement instead.'
        );
    }

    return { advertisement: text.slice(0, MAX_ADVERTISEMENT_LENGTH).trim(), title };
}

export function extractJobAdvertisement(body: string, contentType: string): string {
    return extractJobAdvertisementDetails(body, contentType).advertisement;
}
