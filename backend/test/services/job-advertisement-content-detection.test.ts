import { describe, expect, it } from 'vitest';
import { isHtmlContent } from '@/job-advertisements/extract-content';

describe('HTML content detection', () => {
    it.each(['text/html', 'text/html; charset=utf-8', 'application/xhtml+xml', ''])(
        'recognizes HTML markup for content type %s', contentType => {
            expect(isHtmlContent('<main><p>Job description</p></main>', contentType)).toBe(true);
        }
    );

    it('does not classify explicit plain text as HTML', () => {
        expect(isHtmlContent('<html><body>Literal text</body></html>', 'text/plain')).toBe(false);
    });

    it('does not classify plain content as HTML', () => {
        expect(isHtmlContent('Build TypeScript services and APIs.', 'text/html')).toBe(false);
    });
});
