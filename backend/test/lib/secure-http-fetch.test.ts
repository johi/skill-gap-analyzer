import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createRequestDeadline,
    exceedsResponseSizeLimit,
    fetchSecurePage,
    isPublicAddress,
    parseTarget,
    resolveBeforeDeadline,
    validateResolvedAddresses,
    type HostResolver,
    type PageTransport,
} from '@/lib/secure-http-fetch';
import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';

const resolveHost = vi.fn<HostResolver>();
const transport = vi.fn<PageTransport>();
const url = 'https://careers.example.com/job';
const page = () => ({ status: 200, headers: { 'content-type': 'text/plain' }, body: 'Job description' });

beforeEach(() => {
    vi.resetAllMocks();
    resolveHost.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    transport.mockResolvedValue(page());
});

describe('Secure HTTP fetch', () => {
    const fetchPage = (target = url) => fetchSecurePage(target, resolveHost, transport);

    it('retrieves a public URL, strips fragments, and pins the validated address', async () => {
        const result = await fetchPage(url + '#details');
        expect(result.original.toString()).toBe(url);
        expect(result.response).toEqual(page());
        expect(resolveHost).toHaveBeenCalledExactlyOnceWith('careers.example.com');
        expect(transport).toHaveBeenCalledWith(
            expect.objectContaining({ hostname: 'careers.example.com' }),
            { address: '8.8.8.8', family: 4 },
            expect.anything()
        );
    });

    it.each([
        'file:///etc/passwd', 'ftp://example.com/x', 'http://localhost/x',
        'http://127.0.0.1/x', 'http://[::1]/x', 'http://metadata.google.internal/x',
        'http://example.com:8080/x', 'https://user:pass@example.com/x',
        'http://intranet/x', 'http://169.254.169.254/latest/meta-data',
        'http://[::ffff:127.0.0.1]/x',
    ])('blocks unsafe URL %s without issuing a request', async target => {
        await expect(fetchPage(target)).rejects.toBeInstanceOf(JobAdvertisementRetrievalError);
        expect(transport).not.toHaveBeenCalled();
    });

    it.each([
        '10.1.2.3', '172.17.0.1', '192.168.1.2', '127.0.0.1',
        '169.254.169.254', '100.100.100.200', '::ffff:127.0.0.1',
        'fe80::1', '2001:db8::1', '2002::1', '198.51.100.1',
    ])('blocks reserved DNS addresses (%s)', async address => {
        resolveHost.mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }]);
        await expect(fetchPage()).rejects.toMatchObject({ code: 'unsafe_job_url' });
        expect(transport).not.toHaveBeenCalled();
    });

    it('rejects mixed public/private DNS answers', async () => {
        resolveHost.mockResolvedValue([
            { address: '8.8.8.8', family: 4 },
            { address: '10.0.0.1', family: 4 },
        ]);
        await expect(fetchPage()).rejects.toMatchObject({ code: 'unsafe_job_url' });
        expect(transport).not.toHaveBeenCalled();
    });

    it('rejects empty DNS results and mismatched IP families', async () => {
        expect(() => validateResolvedAddresses([])).toThrow(JobAdvertisementRetrievalError);
        expect(() => validateResolvedAddresses([{ address: '8.8.8.8', family: 6 }]))
            .toThrow(JobAdvertisementRetrievalError);
    });

    it('blocks private redirect targets before contacting them', async () => {
        transport.mockResolvedValueOnce({
            status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' }, body: '',
        });
        await expect(fetchPage()).rejects.toMatchObject({ code: 'unsafe_job_url' });
        expect(transport).toHaveBeenCalledTimes(1);
    });

    it('resolves and pins each safe redirect independently', async () => {
        transport.mockResolvedValueOnce({
            status: 302, headers: { location: 'https://jobs.example.org/openings/42' }, body: '',
        });
        const result = await fetchPage();
        expect(result.original.toString()).toBe(url);
        expect(resolveHost).toHaveBeenCalledTimes(2);
        expect(resolveHost).toHaveBeenNthCalledWith(2, 'jobs.example.org');
        expect(transport).toHaveBeenCalledTimes(2);
    });

    it('enforces the redirect limit', async () => {
        transport.mockResolvedValue({ status: 302, headers: { location: '/redirect' }, body: '' });
        await expect(fetchPage()).rejects.toThrow('redirects too many times');
        expect(transport).toHaveBeenCalledTimes(5);
    });

    it('rejects redirects without a location', async () => {
        transport.mockResolvedValue({ status: 302, headers: {}, body: '' });
        await expect(fetchPage()).rejects.toThrow('redirects too many times');
    });

    it('rejects unsuccessful HTTP statuses', async () => {
        transport.mockResolvedValue({ status: 403, headers: {}, body: '' });
        await expect(fetchPage()).rejects.toThrow('Paste the advertisement instead');
    });

    it('normalizes unexpected transport errors', async () => {
        transport.mockRejectedValue(new Error('internal network details'));
        await expect(fetchPage()).rejects.toMatchObject({ code: 'job_page_unavailable' });
    });

    it('preserves safe retrieval errors from the transport', async () => {
        transport.mockRejectedValue(new JobAdvertisementRetrievalError('Page too large', 413, 'job_page_too_large'));
        await expect(fetchPage()).rejects.toMatchObject({ code: 'job_page_too_large', statusCode: 413 });
    });

    it('validates addresses and response-size boundaries', () => {
        expect(isPublicAddress('8.8.8.8')).toBe(true);
        expect(isPublicAddress('10.0.0.1')).toBe(false);
        expect(exceedsResponseSizeLimit(2_000_000)).toBe(false);
        expect(exceedsResponseSizeLimit(2_000_001)).toBe(true);
        expect(parseTarget(url + '#fragment').hash).toBe('');
    });

    it('creates a shared request deadline', () => {
        expect(createRequestDeadline()).toBeInstanceOf(AbortSignal);
    });

    it('aborts DNS resolution when the supplied signal is aborted', async () => {
        const controller = new AbortController();
        const pending: HostResolver = () => new Promise(() => {});
        const result = resolveBeforeDeadline(pending, 'example.com', controller.signal);
        controller.abort();
        await expect(result).rejects.toThrow('Request timed out');
    });
});
