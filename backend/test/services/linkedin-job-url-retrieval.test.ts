import { describe, expect, it, vi } from 'vitest';
import {
    JobAdvertisementUrlFetcher,
    type HostResolver,
    type PageTransport,
} from '@/services/job-advertisement-url-fetcher';
import { extractLinkedInJobContent } from '@/services/linkedin-job-content';

const jobId = '1234567890';
const description = 'Build reliable TypeScript APIs and improve PostgreSQL queries in a collaborative engineering team.';
const guestHtml = `
<div class="top-card-layout"><h2 class="top-card-layout__title">Backend Developer</h2>
<a class="topcard__org-name-link">Example Company</a>
<span class="topcard__flavor--bullet">Copenhagen</span></div>
<section class="description"><div class="show-more-less-html__markup">
<p>${description}</p><h3>Requirements</h3><ul><li>TypeScript</li><li>PostgreSQL</li></ul>
</div></section>
<ul class="description__job-criteria-list"><li>Employment type: Full-time</li></ul>
<nav>Sign in and view other jobs</nav>`;

function setup(body = guestHtml, status = 200) {
    const resolveHost = vi.fn<HostResolver>().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const transport = vi.fn<PageTransport>().mockResolvedValue({
        status,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: status === 200 ? body : '',
    });
    // Non-LinkedIn URLs follow the regular HTML classification path.
    // LinkedIn guest URLs must bypass this mock entirely.
    const classifyContent = vi.fn().mockImplementation(async (input: string) => ({
        regions: (JSON.parse(input) as { units: Array<{ id: number }> }).units.map(unit => ({
            id: unit.id,
            role: 'advertisement',
        })),
    }));
    return {
        resolveHost,
        transport,
        classifyContent,
        fetcher: new JobAdvertisementUrlFetcher(resolveHost, transport, { classifyContent }),
    };
}

describe('LinkedIn public job retrieval', () => {
    it.each([
        `https://www.linkedin.com/jobs/view/${jobId}/?eBP=INVITE&trk=match&refId=a%2Fb%3D&trackingId=c%2Bd%3D`,
        `https://linkedin.com/jobs/view/${jobId}`,
    ])('fetches the focused guest job description for a normal job URL: %s', async input => {
        const { fetcher, resolveHost, transport, classifyContent } = setup();
        const result = await fetcher.retrieve(input);
        expect(result.sourceUrl).toBe(input);
        expect(result.advertisement).toContain(description);
        expect(result.advertisement).toContain('- TypeScript');
        expect(result.advertisement).not.toContain('Sign in');
        expect(result.title).toBe('Backend Developer');
        expect(result.metadataContext).toContain('Company: Example Company');
        expect(result.metadataContext).toContain('Location: Copenhagen');
        expect(result.metadataContext).toContain('Employment type: Full-time');
        expect(resolveHost).toHaveBeenCalledExactlyOnceWith('www.linkedin.com');
        expect(transport).toHaveBeenCalledWith(
            expect.objectContaining({
                href: `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`,
            }),
            { address: '8.8.8.8', family: 4 },
            expect.anything()
        );
        expect(classifyContent).not.toHaveBeenCalled();
    });

    it('retrieves the selected job from LinkedIn search results without HTML classification', async () => {
        const input = 'https://www.linkedin.com/jobs/search-results/' +
            '?currentJobId=4484232425' +
            '&eBP=NON_CHARGEABLE_CHANNEL' +
            '&refId=FVJlqA5E%2Ba2vvqkQmazs5Q%3D%3D' +
            '&trackingId=SAzFB8LxV2FQG2dU4sPqqQ%3D%3D' +
            '&keywords=jobs%20in%20Denmark' +
            '&origin=SEMANTIC_SEARCH_JOB_ALERT_IN_APP_NOTIFICATION' +
            '&originToLandingJobPostings=4484446108%2C4482231974%2C4466216482%2C4476447911%2C4484232425%2C4484212278' +
            '&geoId=104514075' +
            '&f_TPR=a1793106916-';
        const { fetcher, resolveHost, transport, classifyContent } = setup();

        const result = await fetcher.retrieve(input);

        expect(result.sourceUrl).toBe(input);
        expect(result.advertisement).toContain(description);
        expect(result.advertisement).toContain('- TypeScript');
        expect(result.advertisement).not.toContain('Sign in');
        expect(result.title).toBe('Backend Developer');
        expect(result.metadataContext).toContain('Company: Example Company');
        expect(resolveHost).toHaveBeenCalledExactlyOnceWith('www.linkedin.com');
        expect(transport).toHaveBeenCalledTimes(1);
        expect(transport).toHaveBeenCalledWith(
            expect.objectContaining({
                href: 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4484232425',
            }),
            { address: '8.8.8.8', family: 4 },
            expect.anything()
        );
        expect(classifyContent).not.toHaveBeenCalled();
    });

    it('does not classify large unrelated LinkedIn page content', async () => {
        const largeHtml = guestHtml + `<div>${'<p>Other jobs and navigation</p>'.repeat(5000)}</div>`;
        const { fetcher, classifyContent } = setup(largeHtml);
        const result = await fetcher.retrieve(`https://www.linkedin.com/jobs/view/${jobId}`);
        expect(result.advertisement).toContain(description);
        expect(result.advertisement).not.toContain('Other jobs');
        expect(classifyContent).not.toHaveBeenCalled();
    });

    it('does not silently analyze surrounding HTML when the job description is missing', async () => {
        const { fetcher, classifyContent } = setup(`<main><h1>Sign in</h1><p>${description}</p></main>`);
        await expect(fetcher.retrieve(`https://www.linkedin.com/jobs/view/${jobId}`))
            .rejects.toThrow('did not provide a readable job description');
        expect(classifyContent).not.toHaveBeenCalled();
    });

    it.each([
        'https://example.com/jobs/view/1234567890',
        'https://notlinkedin.com/jobs/view/1234567890',
    ])('leaves non-LinkedIn URLs on the normal classification path: %s', async input => {
        const { fetcher, transport, classifyContent } = setup();
        const result = await fetcher.retrieve(input);
        expect(transport.mock.calls[0]?.[0].href).toBe(input);
        expect(result.advertisement).toContain(description);
        expect(classifyContent).toHaveBeenCalledTimes(1);
    });

    it.each([
        'https://www.linkedin.com/jobs/search/?keywords=developer',
        'https://www.linkedin.com/jobs/search-results/?currentJobId=not-a-job',
        'https://www.linkedin.com/jobs/view/not-a-job',
        'http://www.linkedin.com/jobs/view/1234567890',
    ])('rejects unrecognized or insecure LinkedIn job URLs without classification: %s', async input => {
        const { fetcher, resolveHost, transport, classifyContent } = setup();
        await expect(fetcher.retrieve(input)).rejects.toThrow();
        expect(resolveHost).not.toHaveBeenCalled();
        expect(transport).not.toHaveBeenCalled();
        expect(classifyContent).not.toHaveBeenCalled();
    });

    it('does not revert to the full LinkedIn page on guest retrieval failure', async () => {
        const { fetcher, transport } = setup('', 403);
        await expect(fetcher.retrieve(`https://www.linkedin.com/jobs/view/${jobId}/`))
            .rejects.toThrow('Paste the advertisement instead');
        expect(transport).toHaveBeenCalledTimes(1);
    });

    it('does not follow a guest endpoint redirect to the full LinkedIn page', async () => {
        const { fetcher, transport } = setup();
        transport.mockResolvedValueOnce({
            status: 302, headers: { location: `https://www.linkedin.com/jobs/view/${jobId}/` }, body: '',
        });
        await expect(fetcher.retrieve(`https://www.linkedin.com/jobs/view/${jobId}/`))
            .rejects.toThrow('LinkedIn job details are unavailable');
        expect(transport).toHaveBeenCalledTimes(1);
    });

    it('rejects unsafe guest endpoint DNS resolution before network transport', async () => {
        const { fetcher, resolveHost, transport } = setup();
        resolveHost.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
        await expect(fetcher.retrieve(`https://www.linkedin.com/jobs/view/${jobId}/`))
            .rejects.toThrow('permitted public website');
        expect(transport).not.toHaveBeenCalled();
    });
});

describe('LinkedIn job fragment extraction', () => {
    it('supports the alternate description class', () => {
        const result = extractLinkedInJobContent(`<div class="description__text"><p>${description}</p></div>`);
        expect(result.advertisement).toBe(description);
        expect(result.title).toBeNull();
    });

    it('rejects a guest response with no usable description', () => {
        expect(() => extractLinkedInJobContent('<html><body>Sign in</body></html>'))
            .toThrow('did not provide a readable job description');
    });
});
