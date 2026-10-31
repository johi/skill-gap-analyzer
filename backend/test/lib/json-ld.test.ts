import { describe, expect, it } from 'vitest';
import { findJsonLdObjectsByType } from '@/lib/json-ld';

const find = (html: string) => [...findJsonLdObjectsByType(html, 'JobPosting')];

describe('JSON-LD discovery', () => {
    it('finds objects in arrays and @graph, including URL and array types', () => {
        const html = `<script type="application/ld+json">${JSON.stringify({
            '@graph': [{ '@type': 'Organization' }, { '@type': ['Thing', 'JobPosting'], title: 'First' }],
        })}</script><script type='application/ld+json'>${JSON.stringify([
            { '@type': 'https://schema.org/JobPosting', title: 'Second' },
        ])}</script>`;
        expect(find(html).map(item => item.title)).toEqual(['First', 'Second']);
    });

    it('skips malformed JSON and unrelated scripts', () => {
        const html = `<script type="application/ld+json">{broken</script>
            <script type="text/javascript">{"@type":"JobPosting"}</script>
            <script type=application/ld+json>{"@type":"JobPosting","title":"Valid"}</script>`;
        expect(find(html).map(item => item.title)).toEqual(['Valid']);
    });

    it('returns only the first matching object from each script', () => {
        const html = `<script type="application/ld+json">${JSON.stringify([
            { '@type': 'JobPosting', title: 'First' },
            { '@type': 'JobPosting', title: 'Second' },
        ])}</script>`;
        expect(find(html).map(item => item.title)).toEqual(['First']);
    });

    it('ignores non-object values and scripts with no matching type', () => {
        const html = `<script type="application/ld+json">${JSON.stringify([null, 1, { '@type': 'Organization' }])}</script>`;
        expect(find(html)).toEqual([]);
    });
});
