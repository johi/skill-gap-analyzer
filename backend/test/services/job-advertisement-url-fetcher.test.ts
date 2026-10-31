import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobAdvertisementUrlFetcher, type PageTransport, type HostResolver } from '@/services/job-advertisement-url-fetcher';

const description = 'Develop Laravel APIs and Vue interfaces. Work with PostgreSQL, Redis, and Docker on a collaborative engineering team.';
const resolveHost = vi.fn<HostResolver>();
const transport = vi.fn<PageTransport>();
const page = (body = `<html><body><main><h1>Developer</h1><p>${description}</p></main></body></html>`) => ({
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body,
});

beforeEach(() => {
    vi.resetAllMocks();
    resolveHost.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    transport.mockResolvedValue(page());
});

describe('Job advertisement retrieval', () => {
    const fetcher = () => new JobAdvertisementUrlFetcher(resolveHost, transport);

    it('retrieves a public URL and retains its original source URL', async () => {
        const result = await fetcher().retrieve('https://careers.example.com/jobs/42#details');
        expect(result.sourceUrl).toBe('https://careers.example.com/jobs/42');
        expect(result.advertisement).toContain('Laravel APIs');
    });


    it('extracts job advertisement content and handles supplementary metadata separately', async () => {
        const classifyContent = vi.fn().mockImplementation(async (input: string) => {
            const units = (JSON.parse(input) as { units: Array<{id:number; text:string}> }).units;
            return { regions: units.map(unit => ({ id: unit.id, role: unit.text.startsWith('Deadline:') ? 'metadata' : unit.text === 'Site menu' ? 'noise' : 'advertisement' })) };
        });
        transport.mockResolvedValue(page('<html><body><nav>Site menu</nav><main><h1>Developer</h1><p>' + description + '</p><aside>Deadline: 12 January 2027</aside></main></body></html>'));
        const result = await new JobAdvertisementUrlFetcher(resolveHost, transport, { classifyContent }).retrieve('https://careers.example.com/jobs/42');
        expect(classifyContent).toHaveBeenCalledTimes(1);
        expect(result.advertisement).toContain('Develop Laravel APIs');
        expect(result.advertisement).not.toContain('Deadline:');
        expect(result.advertisement).not.toContain('Site menu');
        expect(result.metadataContext).toContain('Deadline: 12 January 2027');
    });

    it('does not invoke AI for plain text', async () => {
        const classifyContent = vi.fn();
        transport.mockResolvedValue({ status: 200, headers: { 'content-type': 'text/plain' }, body: description });
        const result = await new JobAdvertisementUrlFetcher(resolveHost, transport, { classifyContent }).retrieve('https://careers.example.com/jobs/42');
        expect(result.advertisement).toBe(description);
        expect(classifyContent).not.toHaveBeenCalled();
    });
    it.each([
        'https://linkedin.com/jobs/view/42',
        'https://www.linkedin.com/jobs/view/42',
    ])('requires manual import for LinkedIn URLs (%s)', async url => {
        await expect(fetcher().retrieve(url)).rejects.toMatchObject({
            code: 'linkedin_manual_import_required',
        });
        expect(transport).not.toHaveBeenCalled();
    });

    it('rejects redirects to LinkedIn before requesting them', async () => {
        transport.mockResolvedValueOnce({
            status: 302,
            headers: { location: 'https://www.linkedin.com/jobs/view/42' },
            body: '',
        });
        await expect(fetcher().retrieve('https://careers.example.com/job')).rejects.toMatchObject({
            code: 'linkedin_manual_import_required',
        });
        expect(transport).toHaveBeenCalledTimes(1);
    });
});
