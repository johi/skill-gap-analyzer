import { parseFragment } from 'parse5';
import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';

interface HtmlNode {
    nodeName: string;
    tagName?: string;
    value?: string;
    attrs?: Array<{ name: string; value: string }>;
    childNodes?: HtmlNode[];
}

const omittedTags = new Set(['script', 'style', 'noscript', 'svg', 'template', 'button']);
const blockTags = new Set(['div', 'section', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'br', 'blockquote', 'tr']);

function classNames(node: HtmlNode): string[] {
    return (node.attrs?.find(attribute => attribute.name === 'class')?.value ?? '').split(/\s+/);
}

function hasClass(node: HtmlNode, className: string): boolean {
    return classNames(node).includes(className);
}

function findNode(node: HtmlNode, predicate: (node: HtmlNode) => boolean): HtmlNode | null {
    if (predicate(node)) return node;
    for (const child of node.childNodes ?? []) {
        const result = findNode(child, predicate);
        if (result) return result;
    }
    return null;
}

function renderText(node: HtmlNode): string {
    const chunks: string[] = [];
    function visit(current: HtmlNode, list?: { ordered: boolean; index: number }): void {
        if (current.nodeName === '#text') {
            chunks.push(current.value ?? '');
            return;
        }
        const tag = current.tagName ?? '';
        if (omittedTags.has(tag)) return;
        if (blockTags.has(tag)) chunks.push('\n');
        if (tag === 'li') {
            if (list?.ordered) chunks.push(`${++list.index}. `);
            else chunks.push('- ');
        }
        const nextList = tag === 'ol' || tag === 'ul'
            ? { ordered: tag === 'ol', index: 0 } : list;
        for (const child of current.childNodes ?? []) visit(child, nextList);
        if (blockTags.has(tag)) chunks.push('\n');
    }
    visit(node);
    return chunks.join('')
        .replace(/\u00a0/g, ' ')
        .replace(/[\t\f\v ]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** Read the public LinkedIn job-detail fragment without classifying its surrounding HTML. */
export function extractLinkedInJobContent(html: string): {
    advertisement: string;
    title: string | null;
    metadataContext: string;
} {
    const root = parseFragment(html) as unknown as HtmlNode;
    const description = findNode(root, node => hasClass(node, 'show-more-less-html__markup'))
        ?? findNode(root, node => hasClass(node, 'description__text'));
    const advertisement = description ? renderText(description) : '';
    if (advertisement.length < 50) {
        throw new JobAdvertisementRetrievalError(
            'LinkedIn did not provide a readable job description. Paste the advertisement instead.',
            422,
            'job_description_unavailable'
        );
    }

    const titleNode = findNode(root, node => hasClass(node, 'top-card-layout__title'))
        ?? findNode(root, node => hasClass(node, 'topcard__title'));
    const title = titleNode ? renderText(titleNode).slice(0, 255) || null : null;
    const metadata: string[] = [];
    const company = findNode(root, node => hasClass(node, 'topcard__org-name-link'));
    const location = findNode(root, node => hasClass(node, 'topcard__flavor--bullet'));
    if (company) metadata.push(`Company: ${renderText(company)}`);
    if (location) metadata.push(`Location: ${renderText(location)}`);
    const criteria = findNode(root, node => hasClass(node, 'description__job-criteria-list'));
    if (criteria) metadata.push(renderText(criteria));

    return {
        advertisement: advertisement.slice(0, 30_000),
        title,
        metadataContext: metadata.filter(Boolean).join('\n\n').slice(0, 30_000),
    };
}
