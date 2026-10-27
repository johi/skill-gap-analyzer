import { parse } from 'parse5';
import { z } from 'zod';
import { JobAnalysisInvalidResponseError } from '@/errors/job-analysis-errors';
import { extractJobAdvertisementDetails } from '@/services/job-advertisement-content';

/** Experimental classifier. Not wired into fetching, analysis, or persistence. */
export interface ContentClassificationProvider {
    classifyContent(tree: string): Promise<unknown>;
}

type ContentRole = 'advertisement' | 'metadata' | 'noise' | 'unknown';

interface ContentNode {
    id: number;
    tag: string;
    text?: string;
    attributes?: Record<string, string>;
    children?: ContentNode[];
}

interface ParsedNode {
    nodeName: string;
    tagName?: string;
    value?: string;
    attrs?: Array<{ name: string; value: string }>;
    childNodes?: ParsedNode[];
}

const discardedTags = new Set(['head', 'script', 'style', 'noscript', 'template', 'svg', 'iframe']);
const blockTags = new Set([
    'body', 'main', 'article', 'section', 'aside', 'header', 'footer', 'nav',
    'div', 'p', 'li', 'ul', 'ol', 'dl', 'dt', 'dd', 'table', 'tr', 'td', 'th',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'br',
]);
const forwardedAttributes = new Set(['id', 'class', 'role', 'aria-label']);

const classificationSchema = z.object({
    regions: z.array(z.object({
        id: z.number().int().positive(),
        role: z.enum(['advertisement', 'metadata', 'noise', 'unknown']),
    }).strict()),
}).strict();

export const contentClassificationJsonSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        regions: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    id: { type: 'integer' },
                    role: { type: 'string', enum: ['advertisement', 'metadata', 'noise', 'unknown'] },
                },
                required: ['id', 'role'],
            },
        },
    },
    required: ['regions'],
} as const;

export const contentClassificationInstructions = `You classify every numbered text unit from a job-advertisement web page.
Return one classification for EACH unit ID, with no omissions, duplicates, or invented IDs.
Every unit must be labelled advertisement, metadata, noise, or unknown.

Use each unit's text, ancestor path, explicit preceding/following text, and nearby
heading to understand context. A heading that introduces the next paragraph or list
should be classified consistently with that content unless its meaning clearly differs.
Do not classify an entire container: these are individual text units, and their roles
are independent. A heading and its following paragraph typically share the same role,
unless their meanings differ. Pay special attention to preserving job responsibilities,
requirements, qualifications, employer description, benefits, and application prose.

Roles:
- advertisement: job title, company description relating to this role, duties,
  requirements, qualifications, benefits, and prose explaining how to apply.
- metadata: contact names/roles/emails/phones, application deadlines, locations,
  work hours, employment facts, wherever they appear on the page.
- noise: navigation, footer, links to other jobs, sharing/printing controls,
  cookie controls, general editorial articles and unrelated page content.
- unknown: truly ambiguous content that needs human review.

Never reword content and never infer missing information. Output only IDs and roles.`;

function findBody(node: ParsedNode): ParsedNode | null {
    if (node.tagName === 'body') return node;
    for (const child of node.childNodes ?? []) {
        const result = findBody(child);
        if (result) return result;
    }
    return null;
}

function buildContentTree(html: string): ContentNode {
    // parse5 is a parser only: it never executes scripts or loads embedded resources.
    const parsed = parse(html) as unknown as ParsedNode;
    const body = findBody(parsed) ?? parsed;
    let nextId = 0;

    function convert(source: ParsedNode): ContentNode | null {
        if (discardedTags.has(source.tagName ?? '')) return null;
        if (source.nodeName === '#comment') return null;
        if (source.nodeName === '#text') {
            const text = source.value?.replace(/\s+/g, ' ').trim();
            return text ? { id: ++nextId, tag: '#text', text } : null;
        }
        if (!source.tagName && source !== body) return null;

        const id = ++nextId;
        const children = (source.childNodes ?? [])
            .map(convert)
            .filter((item): item is ContentNode => item !== null);
        if (children.length === 0) return null;

        const attributes = Object.fromEntries((source.attrs ?? [])
            .filter(attribute => forwardedAttributes.has(attribute.name))
            .map(attribute => [attribute.name, attribute.value.slice(0, 120)]));

        return {
            id,
            tag: source.tagName ?? 'document',
            ...(Object.keys(attributes).length ? { attributes } : {}),
            children,
        };
    }

    const tree = convert(body);
    if (!tree) throw new JobAnalysisInvalidResponseError();
    return tree;
}

interface TextUnit {
    id: number;
    text: string;
    context: string[];
    previous?: { id: number; text: string };
    next?: { id: number; text: string };
    precedingHeading?: { id: number; text: string };
}

/** Each nonempty text node is independently classifiable, even in deeply nested DOM. */
function collectTextUnits(root: ContentNode): TextUnit[] {
    const units: TextUnit[] = [];
    function walk(node: ContentNode, ancestors: string[]): void {
        if (node.tag === '#text') {
            units.push({ id: node.id, text: node.text ?? '', context: ancestors });
            return;
        }
        const attributes = node.attributes
            ? Object.entries(node.attributes).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(' ')
            : '';
        const context = `${node.tag}${attributes ? ` ${attributes}` : ''}`;
        for (const child of node.children ?? []) walk(child, [...ancestors, context]);
    }
    walk(root, []);
    // Explicitly connect nearby units so the model sees headings alongside prose.
    // These fields are context only; each unit must still receive its own role.
    let heading: { id: number; text: string } | undefined;
    for (let index = 0; index < units.length; index++) {
        const unit = units[index]!;
        const previous = units[index - 1];
        const next = units[index + 1];
        if (previous) unit.previous = { id: previous.id, text: previous.text.slice(0, 240) };
        if (next) unit.next = { id: next.id, text: next.text.slice(0, 240) };
        const parentTag = unit.context.at(-1)?.split(' ', 1)[0] ?? '';
        if (/^h[1-6]$/.test(parentTag) || parentTag === 'strong') {
            heading = { id: unit.id, text: unit.text.slice(0, 240) };
        } else if (heading) {
            unit.precedingHeading = heading;
        }
    }
    return units;
}

/** Keep debugging opt-in; show every original text node including excluded ones. */
function printClassificationTrace(units: TextUnit[], roles: Map<number, ContentRole>, advertisement: string, metadataContext: string): void {
    const counts: Record<ContentRole, number> = { advertisement: 0, metadata: 0, noise: 0, unknown: 0 };
    const lines: string[] = [];
    for (const unit of units) {
        const role = roles.get(unit.id) ?? 'unknown';
        counts[role]++;
        lines.push(`id=${unit.id} role=${role} output=${role === 'advertisement' ? 'advertisement' : role === 'metadata' ? 'metadataContext' : 'EXCLUDED'} context=${unit.context.join(' > ')} text=${JSON.stringify(unit.text)}`);
    }
    console.error('\n[HTML CLASSIFICATION TRACE]\n' + lines.join('\n') +
        `\n[SUMMARY] total=${units.length} advertisement=${counts.advertisement} metadata=${counts.metadata} noise=${counts.noise} unknown=${counts.unknown} advertisementChars=${advertisement.length} metadataChars=${metadataContext.length}` +
        '\n[END HTML CLASSIFICATION TRACE]\n');
}

/** Output comes strictly from original text nodes, never from model-generated text. */
function renderRole(root: ContentNode, roles: Map<number, ContentRole>, requested: ContentRole): string {
    const chunks: string[] = [];
    function walk(node: ContentNode): boolean {
        if (node.tag === '#text') {
            if (roles.get(node.id) !== requested) return false;
            chunks.push(node.text ?? '');
            return true;
        }
        const start = chunks.length;
        if (blockTags.has(node.tag)) chunks.push('\n');
        let included = false;
        for (const child of node.children ?? []) included = walk(child) || included;
        if (blockTags.has(node.tag)) chunks.push('\n');
        if (!included) chunks.splice(start);
        return included;
    }
    walk(root);
    return chunks.join(' ')
        .replace(/[\t\f\v ]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function findJobPosting(value: unknown): Record<string, unknown> | null {
    if (Array.isArray(value)) {
        for (const item of value) {
            const result = findJobPosting(item);
            if (result) return result;
        }
        return null;
    }
    if (!value || typeof value !== 'object') return null;
    const object = value as Record<string, unknown>;
    const type = object['@type'];
    if (type === 'JobPosting' ||
        (Array.isArray(type) && type.includes('JobPosting')) ||
        (typeof type === 'string' && type.endsWith('/JobPosting'))) return object;
    return findJobPosting(object['@graph']);
}

function structuredJobMetadata(html: string): string | null {
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
        if (!/\btype\s*=\s*(?:["']application\/ld\+json["']|application\/ld\+json(?:\s|$))/i.test(match[1] ?? '')) continue;
        try {
            const posting = findJobPosting(JSON.parse(match[2] ?? ''));
            if (!posting || typeof posting.description !== 'string') continue;
            const organization = posting.hiringOrganization;
            const name = organization && typeof organization === 'object' && !Array.isArray(organization)
                ? (organization as Record<string, unknown>).name : null;
            const details = [
                typeof name === 'string' ? `Employer: ${name}` : null,
                typeof posting.validThrough === 'string' ? `Application deadline: ${posting.validThrough}` : null,
            ].filter((item): item is string => item !== null);
            return details.join('\n');
        } catch {
            // Ignore malformed structured data and classify visible content instead.
        }
    }
    return null;
}

/** Run the experiment independently of the existing synchronous extractor. */
export async function classifyHtmlJobAdvertisement(
    html: string,
    provider: ContentClassificationProvider
): Promise<{ advertisement: string; title: string | null; metadataContext: string }> {
    // JSON-LD already supplies a trustworthy description; do not replace it with AI.
    const jsonLdMetadata = structuredJobMetadata(html);
    if (jsonLdMetadata !== null) {
        const extracted = extractJobAdvertisementDetails(html, 'text/html');
        return { ...extracted, metadataContext: jsonLdMetadata };
    }

    const tree = buildContentTree(html);
    const units = collectTextUnits(tree);
    // Send ordered text units with DOM ancestry. The model must classify each one.
    const input = JSON.stringify({ units });
    const result = classificationSchema.safeParse(await provider.classifyContent(input));
    if (!result.success) throw new JobAnalysisInvalidResponseError();

    const knownIds = new Set(units.map(unit => unit.id));
    const roles = new Map<number, ContentRole>();
    for (const classification of result.data.regions) {
        if (!knownIds.has(classification.id) || roles.has(classification.id)) {
            throw new JobAnalysisInvalidResponseError();
        }
        roles.set(classification.id, classification.role);
    }
    // Omissions are errors rather than silently discarding genuine advertisement text.
    if (roles.size !== knownIds.size) throw new JobAnalysisInvalidResponseError();

    const advertisement = renderRole(tree, roles, 'advertisement').slice(0, 30_000).trim();
    const metadataContext = renderRole(tree, roles, 'metadata').slice(0, 30_000).trim();
    if (process.env.DEBUG_HTML_CLASSIFICATION === '1' && process.env.VITEST !== 'true') {
        printClassificationTrace(units, roles, advertisement, metadataContext);
    }
    if (!advertisement || advertisement.length < 50) throw new JobAnalysisInvalidResponseError();
    return { advertisement, title: null, metadataContext };
}
