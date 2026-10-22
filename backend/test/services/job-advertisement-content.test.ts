import { describe, expect, it } from 'vitest';
import { extractJobAdvertisement } from '@/services/job-advertisement-content';
import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';

const description = 'Develop Laravel APIs and Vue interfaces. Work with PostgreSQL, Redis, and Docker on a collaborative engineering team.';

describe('Job advertisement content extraction', () => {
    it('prefers JobPosting JSON-LD, including @graph and HTML descriptions', () => {
        const html = `<html><body><nav>Navigation and links</nav>
            <script type="application/ld+json">${JSON.stringify({
                '@graph': [{ '@type': 'Organization', name: 'Other' }, {
                    '@type': 'JobPosting', title: 'Senior Developer',
                    hiringOrganization: { name: 'Example Company' },
                    jobLocation: { address: { addressLocality: 'Copenhagen', addressCountry: 'DK' } },
                    description: `<p>${description}</p><p>Apply now &amp; join us.</p>`,
                }],
            })}</script><main>Generic content that is not the job advertisement.</main></body></html>`;
        const text = extractJobAdvertisement(html, 'text/html; charset=utf-8');
        expect(text).toContain('Job title: Senior Developer');
        expect(text).toContain('Company: Example Company');
        expect(text).toContain('Location: Copenhagen, DK');
        expect(text).toContain('Apply now & join us.');
        expect(text).not.toContain('Navigation and links');
    });

    it('falls back to readable main text if JSON-LD is absent or malformed', () => {
        const html = `<html><body><nav>Lots of navigation text and menus</nav>
            <script type="application/ld+json">{invalid}</script>
            <main><h1>Full-stack Engineer</h1><p>${description}</p></main>
            <footer>Privacy cookie policy</footer></body></html>`;
        const text = extractJobAdvertisement(html, 'text/html');
        expect(text).toContain('Full-stack Engineer');
        expect(text).toContain('PostgreSQL, Redis');
        expect(text).not.toContain('Privacy cookie policy');
    });

    it('accepts plain text and limits it to the existing analysis contract', () => {
        expect(extractJobAdvertisement(description, 'text/plain')).toBe(description);
        expect(extractJobAdvertisement('a'.repeat(50_000), 'text/plain')).toHaveLength(30_000);
    });

    it('rejects unsupported content types and pages with no advertisement', () => {
        expect(() => extractJobAdvertisement('%PDF-1.7', 'application/pdf'))
            .toThrow(JobAdvertisementRetrievalError);
        expect(() => extractJobAdvertisement('<html><body>Sign in</body></html>', 'text/html'))
            .toThrow(JobAdvertisementRetrievalError);
    });
});
