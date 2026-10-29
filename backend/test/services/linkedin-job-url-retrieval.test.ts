import { describe, expect, it, vi } from 'vitest';
import {
    JobAdvertisementUrlFetcher,
    type HostResolver,
    type PageTransport,
} from '@/services/job-advertisement-url-fetcher';

const jobId = '1234567890';
const description = 'Build reliable TypeScript APIs and improve PostgreSQL queries in a collaborative engineering team.';
const html = `<main><h1>Backend Developer</h1><p>${description}</p></main>`;

function setup() {
    const resolveHost = vi.fn<HostResolver>().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const transport = vi.fn<PageTransport>().mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: html,
    });
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

describe('LinkedIn URLs require manual import', () => {
    it.each([
        `https://www.linkedin.com/jobs/view/${jobId}/`,
        `https://linkedin.com/jobs/view/${jobId}`,
        `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`,
        `https://www.linkedin.com/jobs/search-results/?currentJobId=${jobId}`,
        'https://www.linkedin.com/jobs/search/?keywords=developer',
        'https://uk.linkedin.com/jobs/view/1234567890',
        'https://www.linkedin.com/company/example',
    ])('rejects %s before any network request or classification', async input => {
        const { fetcher, resolveHost, transport, classifyContent } = setup();
        await expect(fetcher.retrieve(input)).rejects.toThrow(
            'LinkedIn job ads cannot be imported automatically'
        );
        expect(resolveHost).not.toHaveBeenCalled();
        expect(transport).not.toHaveBeenCalled();
        expect(classifyContent).not.toHaveBeenCalled();
    });

    it('also rejects redirects to LinkedIn before contacting LinkedIn', async () => {
        const { fetcher, resolveHost, transport, classifyContent } = setup();
        transport.mockResolvedValueOnce({
            status: 302,
            headers: { location: `https://www.linkedin.com/jobs/view/${jobId}/` },
            body: '',
        });
        await expect(fetcher.retrieve('https://example.com/job')).rejects.toThrow(
            'LinkedIn job ads cannot be imported automatically'
        );
        expect(resolveHost).toHaveBeenCalledTimes(1);
        expect(transport).toHaveBeenCalledTimes(1);
        expect(classifyContent).not.toHaveBeenCalled();
    });

    it.each([
        'https://example.com/jobs/view/1234567890',
        'https://notlinkedin.com/jobs/view/1234567890',
    ])('keeps non-LinkedIn URLs on the existing classification path: %s', async input => {
        const { fetcher, transport, classifyContent } = setup();
        const result = await fetcher.retrieve(input);
        expect(transport.mock.calls[0]?.[0].href).toBe(input);
        expect(result.advertisement).toContain(description);
        expect(classifyContent).toHaveBeenCalledTimes(1);
    });
});
