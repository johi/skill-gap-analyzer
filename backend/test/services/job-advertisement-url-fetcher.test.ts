import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobAdvertisementUrlFetcher, type PageTransport, type HostResolver } from '@/services/job-advertisement-url-fetcher';
import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';

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

describe('Secure job URL retrieval', () => {
    const fetcher = () => new JobAdvertisementUrlFetcher(resolveHost, transport);

    it('retrieves a public URL and retains its original source URL', async () => {
        const result = await fetcher().retrieve('https://careers.example.com/jobs/42#details');
        expect(result.sourceUrl).toBe('https://careers.example.com/jobs/42');
        expect(result.advertisement).toContain('Laravel APIs');
        expect(resolveHost).toHaveBeenCalledExactlyOnceWith('careers.example.com');
        expect(transport).toHaveBeenCalledWith(
            expect.objectContaining({ hostname: 'careers.example.com' }),
            { address: '8.8.8.8', family: 4 }, expect.anything()
        );
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
        'file:///etc/passwd', 'ftp://example.com/x', 'http://localhost/x',
        'http://127.0.0.1/x', 'http://[::1]/x', 'http://metadata.google.internal/x',
        'http://example.com:8080/x', 'https://user:pass@example.com/x',
        'http://intranet/x', 'http://169.254.169.254/latest/meta-data',
        'http://[::ffff:127.0.0.1]/x',
    ])('blocks unsafe URL %s without issuing a request', async url => {
        await expect(fetcher().retrieve(url)).rejects.toBeInstanceOf(JobAdvertisementRetrievalError);
        expect(transport).not.toHaveBeenCalled();
    });

    it.each(['10.1.2.3', '172.17.0.1', '192.168.1.2', '127.0.0.1',
        '169.254.169.254', '100.100.100.200', '::ffff:127.0.0.1',
        'fe80::1', '2001:db8::1', '2002::1', '198.51.100.1',
    ])('blocks DNS answers with reserved addresses (%s)', async address => {
        resolveHost.mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }]);
        await expect(fetcher().retrieve('https://careers.example.com/job')).rejects.toMatchObject({ code: 'unsafe_job_url' });
        expect(transport).not.toHaveBeenCalled();
    });

    it('rejects a mixed public/private DNS answer rather than choosing a public one', async () => {
        resolveHost.mockResolvedValue([{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }]);
        await expect(fetcher().retrieve('https://careers.example.com/job')).rejects.toMatchObject({ code: 'unsafe_job_url' });
        expect(transport).not.toHaveBeenCalled();
    });

    it('rechecks redirects and blocks private redirect targets', async () => {
        transport.mockResolvedValueOnce({ status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' }, body: '' });
        await expect(fetcher().retrieve('https://careers.example.com/job')).rejects.toBeInstanceOf(JobAdvertisementRetrievalError);
        expect(transport).toHaveBeenCalledTimes(1);
    });

    it('resolves and pins each safe redirect independently', async () => {
        transport.mockResolvedValueOnce({ status: 302, headers: { location: 'https://jobs.example.org/openings/42' }, body: '' });
        const result = await fetcher().retrieve('https://careers.example.com/job');
        expect(result.sourceUrl).toBe('https://careers.example.com/job');
        expect(resolveHost).toHaveBeenCalledTimes(2);
        expect(resolveHost).toHaveBeenNthCalledWith(2, 'jobs.example.org');
        expect(transport).toHaveBeenCalledTimes(2);
    });

    it('limits redirects and handles inaccessible sites with a paste fallback message', async () => {
        transport.mockResolvedValue({ status: 302, headers: { location: '/redirect' }, body: '' });
        await expect(fetcher().retrieve('https://careers.example.com/job'))
            .rejects.toThrow('redirects too many times');
        expect(transport).toHaveBeenCalledTimes(5);
    });

    it('rejects pages that block automated retrieval', async () => {
        transport.mockResolvedValue({ status: 403, headers: {}, body: '' });
        await expect(fetcher().retrieve('https://careers.example.com/job'))
            .rejects.toThrow('Paste the advertisement instead');
    });
});
