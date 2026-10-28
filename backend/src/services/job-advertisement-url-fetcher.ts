import { lookup } from 'node:dns/promises';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest, type RequestOptions as HttpsRequestOptions } from 'node:https';
import type { Readable } from 'node:stream';
import { BlockList, isIP } from 'node:net';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';
import { extractJobAdvertisement } from '@/services/job-advertisement-content';
import { classifyHtmlJobAdvertisement, type ContentClassificationProvider } from '@/services/job-advertisement-dom-classification';
import { extractLinkedInJobContent } from '@/services/linkedin-job-content';

const MAX_PAGE_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;
const REQUEST_TIMEOUT_MS = 12_000;

const reservedIpv4 = new BlockList();
for (const [address, bits] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
    ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
    ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24],
    ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
    ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) reservedIpv4.addSubnet(address, bits, 'ipv4');

const globalIpv6 = new BlockList();
globalIpv6.addSubnet('2000::', 3, 'ipv6');
const reservedIpv6 = new BlockList();
for (const [address, bits] of [
    ['2001::', 32], ['2001:2::', 48], ['2001:10::', 28],
    ['2001:20::', 28], ['2001:db8::', 32], ['2002::', 16],
] as const) reservedIpv6.addSubnet(address, bits, 'ipv6');

function isPublicAddress(address: string): boolean {
    if (isIP(address) === 4) return !reservedIpv4.check(address, 'ipv4');
    if (isIP(address) === 6) {
        return globalIpv6.check(address, 'ipv6') && !reservedIpv6.check(address, 'ipv6');
    }
    return false;
}

export interface ResolvedAddress { address: string; family: number }
export type HostResolver = (hostname: string) => Promise<ResolvedAddress[]>;
export interface PageResponse {
    status: number;
    headers: IncomingHttpHeaders;
    body: string;
}
export type PageTransport = (url: URL, address: ResolvedAddress, signal: AbortSignal) => Promise<PageResponse>;

function parseTarget(value: string): URL {
    let url: URL;
    try { url = new URL(value); } catch {
        throw new JobAdvertisementRetrievalError('Enter a valid HTTP or HTTPS URL.', 400, 'invalid_job_url');
    }
    const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    const forbiddenSuffixes = ['.localhost', '.local', '.internal', '.test', '.invalid', '.onion'];
    if (
        !['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        (url.port !== '' && url.port !== (url.protocol === 'https:' ? '443' : '80')) ||
        (!hostname.includes('.') && isIP(hostname) === 0) ||
        hostname === 'localhost' || forbiddenSuffixes.some(suffix => hostname.endsWith(suffix))
    ) {
        throw new JobAdvertisementRetrievalError('Only public HTTP or HTTPS job URLs are supported.', 400, 'invalid_job_url');
    }
    url.hash = '';
    return url;
}

interface LinkedInJobTarget {
    url: URL;
    isGuest: boolean;
}

/** Resolve LinkedIn job links to their focused guest job-detail document. */
function resolveLinkedInJobUrl(url: URL): LinkedInJobTarget {
    const hostname = url.hostname.toLowerCase();
    if (!['linkedin.com', 'www.linkedin.com'].includes(hostname)) {
        return { url, isGuest: false };
    }

    const guestMatch = /^\/jobs-guest\/jobs\/api\/jobPosting\/([0-9]+)\/?$/.exec(url.pathname);
    const isJobsPage = url.pathname === '/jobs' || url.pathname.startsWith('/jobs/');
    const isGuestPage = url.pathname.startsWith('/jobs-guest/');
    if (!isJobsPage && !isGuestPage) {
        return { url, isGuest: false };
    }
    if (url.protocol !== 'https:') {
        throw new JobAdvertisementRetrievalError('LinkedIn job URLs must use HTTPS.', 400, 'invalid_job_url');
    }

    // A selected job may be embedded in search results, alerts, or collections.
    const viewMatch = /^\/jobs\/view\/(?:[^/]*-)?([0-9]+)\/?$/.exec(url.pathname);
    const jobId = guestMatch?.[1] ?? viewMatch?.[1] ?? url.searchParams.get('currentJobId');
    if (!jobId || !/^[0-9]+$/.test(jobId)) {
        // Never classify a LinkedIn jobs listing as an advertisement.
        throw new JobAdvertisementRetrievalError(
            'Could not identify a LinkedIn job ID. Open a specific job and try again.',
            400,
            'invalid_job_url'
        );
    }

    return {
        url: new URL(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`),
        isGuest: true,
    };
}

async function requestPage(url: URL, pinned: ResolvedAddress, signal: AbortSignal): Promise<PageResponse> {
    return new Promise<PageResponse>((resolve, reject) => {
        const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
        // Connect to the *validated IP*, not a hostname that could resolve again.
        // Preserve the original hostname for the Host header, TLS SNI and certificate validation.
        const options: HttpsRequestOptions = {
            protocol: url.protocol,
            hostname: pinned.address,
            family: pinned.family,
            port: url.protocol === 'https:' ? 443 : 80,
            path: `${url.pathname}${url.search}`,
            method: 'GET',
            servername: url.hostname.replace(/^\[|\]$/g, ''),
            signal,
            headers: {
                Host: url.host,
                'User-Agent': 'SkillGapAnalyzer/1.0 (job-advertisement-import)',
                Accept: 'text/html, application/xhtml+xml, text/plain',
                'Accept-Encoding': 'gzip, deflate, br, identity',
            },
        };
        const req = request(options, response => {
            const status = response.statusCode ?? 0;
            const headers = response.headers;
            if ([301, 302, 303, 307, 308].includes(status) || status !== 200) {
                response.destroy();
                resolve({ status, headers, body: '' });
                return;
            }
            const encoding = String(headers['content-encoding'] ?? 'identity').toLowerCase().trim();
            let stream: Readable = response;
            if (encoding === 'gzip') stream = response.pipe(createGunzip());
            else if (encoding === 'deflate') stream = response.pipe(createInflate());
            else if (encoding === 'br') stream = response.pipe(createBrotliDecompress());
            else if (encoding !== 'identity') {
                response.destroy();
                reject(new JobAdvertisementRetrievalError('Unsupported page encoding. Paste the advertisement instead.'));
                return;
            }
            void (async () => {
                const chunks: Buffer[] = [];
                let total = 0;
                try {
                    for await (const chunk of stream) {
                        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                        total += buffer.length;
                        if (total > MAX_PAGE_BYTES) {
                            throw new JobAdvertisementRetrievalError('The job page is too large to import. Paste the advertisement instead.', 413, 'job_page_too_large');
                        }
                        chunks.push(buffer);
                    }
                    resolve({ status, headers, body: Buffer.concat(chunks).toString('utf8') });
                } catch (error) {
                    req.destroy();
                    reject(error);
                }
            })();
        });
        req.on('error', reject);
        req.end();
    });
}

async function resolveBeforeDeadline(
    resolver: HostResolver, host: string, signal: AbortSignal
): Promise<ResolvedAddress[]> {
    if (signal.aborted) throw new Error('Request timed out');
    return new Promise<ResolvedAddress[]>((resolve, reject) => {
        const abort = () => reject(new Error('Request timed out'));
        signal.addEventListener('abort', abort, { once: true });
        resolver(host).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
}

/** Fetches only public HTTP(S) pages. Every redirect is validated and DNS is pinned. */
export class JobAdvertisementUrlFetcher {
    constructor(
        private readonly resolveHost: HostResolver = async hostname => lookup(hostname, { all: true }),
        private readonly transport: PageTransport = requestPage,
        private readonly classifier?: ContentClassificationProvider
    ) {}

    async retrieve(rawUrl: string): Promise<{ sourceUrl: string; advertisement: string; title?: string | null; metadataContext?: string }> {
        const original = parseTarget(rawUrl);
        const linkedInTarget = resolveLinkedInJobUrl(original);
        let current = linkedInTarget.url;
        const linkedInGuest = linkedInTarget.isGuest;
        const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
        for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
            const host = current.hostname.replace(/^\[|\]$/g, '');
            let addresses: ResolvedAddress[];
            try {
                addresses = isIP(host)
                    ? [{ address: host, family: isIP(host) }]
                    : await resolveBeforeDeadline(this.resolveHost, host, signal);
            } catch {
                throw new JobAdvertisementRetrievalError('The job website could not be resolved. Paste the advertisement instead.');
            }
            if (!addresses.length || addresses.some(item => !isPublicAddress(item.address) || isIP(item.address) !== item.family)) {
                throw new JobAdvertisementRetrievalError('This URL does not resolve to a permitted public website.', 400, 'unsafe_job_url');
            }
            let response: PageResponse;
            try {
                response = await this.transport(current, addresses[0]!, signal);
            } catch (error) {
                if (error instanceof JobAdvertisementRetrievalError) throw error;
                throw new JobAdvertisementRetrievalError('The job website could not be retrieved. Paste the advertisement instead.');
            }
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                const location = response.headers.location;
                if (!location || redirect === MAX_REDIRECTS) {
                    throw new JobAdvertisementRetrievalError('The job page redirects too many times. Paste the advertisement instead.');
                }
                try {
                    const redirected = parseTarget(new URL(location, current).toString());
                    // Never fall back to a full LinkedIn page or an unrelated endpoint.
                    if (linkedInGuest && (redirected.hostname !== 'www.linkedin.com' ||
                        !/^\/jobs-guest\/jobs\/api\/jobPosting\/[0-9]+\/?$/.test(redirected.pathname))) {
                        throw new JobAdvertisementRetrievalError(
                            'LinkedIn job details are unavailable. Paste the advertisement instead.'
                        );
                    }
                    current = redirected;
                } catch (error) {
                    if (error instanceof JobAdvertisementRetrievalError) throw error;
                    throw new JobAdvertisementRetrievalError('The job website redirected to an invalid URL. Paste the advertisement instead.');
                }
                continue;
            }
            if (response.status !== 200) {
                if (linkedInGuest) {
                    throw new JobAdvertisementRetrievalError(
                        `LinkedIn job details could not be retrieved (HTTP ${response.status}). Paste the advertisement instead.`
                    );
                }
                throw new JobAdvertisementRetrievalError(
                    `The job website returned HTTP ${response.status}. Paste the advertisement instead.`
                );
            }
            const contentType = String(response.headers['content-type'] ?? '');
            if (linkedInGuest) {
                const mediaType = contentType.toLowerCase().split(';')[0]?.trim();
                if (mediaType && !['text/html', 'application/xhtml+xml'].includes(mediaType)) {
                    throw new JobAdvertisementRetrievalError(
                        'LinkedIn did not return an HTML job description. Paste the advertisement instead.'
                    );
                }
                return { sourceUrl: original.toString(), ...extractLinkedInJobContent(response.body) };
            }

            // Other sources retain their existing HTML classification and plain-text extraction.
            const type = contentType.toLowerCase().split(';')[0]?.trim();
            const isHtml = type !== 'text/plain' &&
                /<\s*(?:!doctype|html|head|body|main|article|div|p|script)\b/i.test(response.body);
            if (this.classifier && isHtml) {
                // Validate the media type before invoking AI.
                if (type && !['text/html', 'application/xhtml+xml'].includes(type)) {
                    return { sourceUrl: original.toString(), advertisement: extractJobAdvertisement(response.body, contentType) };
                }
                const extracted = await classifyHtmlJobAdvertisement(response.body, this.classifier);
                return {
                    sourceUrl: original.toString(),
                    advertisement: extracted.advertisement,
                    title: extracted.title,
                    metadataContext: extracted.metadataContext,
                };
            }
            return {
                sourceUrl: original.toString(),
                advertisement: extractJobAdvertisement(response.body, contentType),
            };
        }
        throw new JobAdvertisementRetrievalError('Too many redirects. Paste the advertisement instead.');
    }
}
