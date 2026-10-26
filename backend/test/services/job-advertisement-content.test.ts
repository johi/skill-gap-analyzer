import { describe, expect, it } from 'vitest';
import { extractJobAdvertisement, extractJobAdvertisementDetails } from '@/services/job-advertisement-content';
import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';

const description = 'Develop Laravel APIs and Vue interfaces. Work with PostgreSQL, Redis, and Docker on a collaborative engineering team.';

describe('Job advertisement content extraction', () => {
    it('prefers JobPosting JSON-LD description without generated metadata, including @graph and HTML descriptions', () => {
        const html = `<html><body><nav>Navigation and links</nav>
            <script type="application/ld+json">${JSON.stringify({
                '@graph': [{ '@type': 'Organization', name: 'Other' }, {
                    '@type': 'JobPosting', title: 'Senior Developer',
                    hiringOrganization: { name: 'Example Company' },
                    jobLocation: { address: { addressLocality: 'Copenhagen', addressCountry: 'DK' } },
                    employmentType: 'FULL_TIME',
                    description: `<p>${description}</p><p>Apply now &amp; join us.</p>`,
                }],
            })}</script><main>Generic content that is not the job advertisement.</main></body></html>`;
        const text = extractJobAdvertisement(html, 'text/html; charset=utf-8');
        expect(text).toMatch(/^Senior Developer\n\n/);
        expect(text).toContain(description);
        expect(text).toContain('Apply now & join us.');
        expect(text).not.toContain('Job title: Senior Developer');
        expect(text).not.toContain('Company: Example Company');
        expect(text).not.toContain('Location: Copenhagen, DK');
        expect(text).not.toContain('Employment type: FULL_TIME');
        expect(text).not.toContain('Generic content that is not the job advertisement.');
        expect(text).not.toContain('Navigation and links');
    });

    it('exposes JSON-LD job title separately from the clean advertisement', () => {
        const html = `<html><body><script type="application/ld+json">${JSON.stringify({
            '@type': 'JobPosting', title: 'Senior Platform Developer',
            description: `<p>${description}</p>`,
        })}</script></body></html>`;
        const result = extractJobAdvertisementDetails(html, 'text/html');
        expect(result.title).toBe('Senior Platform Developer');
        expect(result.advertisement).toBe(`Senior Platform Developer\n\n${description}`);
        expect(result.advertisement).not.toContain('Job title:');
    });

    it('decodes entity-encoded HTML before stripping markup', () => {
        const encodedDescription = '&lt;p&gt;&lt;strong&gt;THE OPPORTUNITY&lt;/strong&gt;&lt;/p&gt;' +
            '&lt;p&gt;Webshop&#39;s branch builds PHP (Symfony) applications and works with RabbitMQ and Google Pub/Sub.&lt;/p&gt;' +
            '&lt;p&gt;Work with Elasticsearch and Manticore Search.&lt;br&gt;Deploy continuously.&lt;/p&gt;' +
            '&lt;p&gt;Our HQ is in Copenhagen,&amp;nbsp;Denmark.&lt;/p&gt;';
        const html = `<html><body><script type="application/ld+json">${JSON.stringify({
            '@type': 'JobPosting', description: encodedDescription,
        })}</script><main>Unrelated page content</main></body></html>`;
        const text = extractJobAdvertisement(html, 'text/html');
        expect(text).toContain('THE OPPORTUNITY');
        expect(text).toContain("Webshop's branch");
        expect(text).toContain('RabbitMQ and Google Pub/Sub.');
        expect(text).toContain('Manticore Search.\nDeploy continuously.');
        expect(text).toContain('Copenhagen, Denmark.');
        expect(text).not.toMatch(/<\/?(?:p|strong|br)\b/i);
        expect(text).not.toContain('&lt;');
        expect(text).not.toContain('&amp;nbsp;');
        expect(text).not.toContain('Unrelated page content');
    });

    it('does not duplicate a title already present as the first heading', () => {
        const html = `<html><body><script type="application/ld+json">${JSON.stringify({
            '@type': 'JobPosting',
            title: 'Platform Engineer',
            description: '<h1>Platform Engineer</h1><p>Build and maintain APIs, databases, and automated deployments for a growing engineering team.</p>',
        })}</script></body></html>`;
        const text = extractJobAdvertisement(html, 'text/html');
        expect(text.match(/Platform Engineer/g)).toHaveLength(1);
        expect(text).toContain('Build and maintain APIs');
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
