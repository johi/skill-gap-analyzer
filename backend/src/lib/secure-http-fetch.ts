import { lookup } from 'node:dns/promises';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest, type RequestOptions as HttpsRequestOptions } from 'node:https';
import type { Readable } from 'node:stream';
import { BlockList, isIP } from 'node:net';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';

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

/** Rejects reserved IPv4 and non-global or reserved IPv6 addresses. */
export function isPublicAddress(address: string): boolean {
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

/** Validates URL syntax, HTTP(S) protocol, credentials, ports and local hostnames. */
export function parseTarget(value: string): URL {
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


/** Requests a pinned IP while retaining the hostname for Host, TLS SNI and certificate verification. */
export async function requestPage(url: URL, pinned: ResolvedAddress, signal: AbortSignal): Promise<PageResponse> {
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
                        if (exceedsResponseSizeLimit(total)) {
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

/** Applies the shared abort deadline to asynchronous DNS resolution. */
export async function resolveBeforeDeadline(
    resolver: HostResolver, host: string, signal: AbortSignal
): Promise<ResolvedAddress[]> {
    if (signal.aborted) throw new Error('Request timed out');
    return new Promise<ResolvedAddress[]>((resolve, reject) => {
        const abort = () => reject(new Error('Request timed out'));
        signal.addEventListener('abort', abort, { once: true });
        resolver(host).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
}

/** Validates all DNS answers to prevent access to private networks and DNS rebinding. */
export function validateResolvedAddresses(addresses: ResolvedAddress[]): ResolvedAddress {
    if (!addresses.length || addresses.some(item => !isPublicAddress(item.address) || isIP(item.address) !== item.family)) {
        throw new JobAdvertisementRetrievalError('This URL does not resolve to a permitted public website.', 400, 'unsafe_job_url');
    }
    return addresses[0]!;
}

/** Resolves a hostname once per hop and pins the transport to the validated IP. */
export async function resolveAndPinAddress(url: URL, resolver: HostResolver, signal: AbortSignal): Promise<ResolvedAddress> {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    let addresses: ResolvedAddress[];
    try {
        addresses = isIP(host)
            ? [{ address: host, family: isIP(host) }]
            : await resolveBeforeDeadline(resolver, host, signal);
    } catch {
        throw new JobAdvertisementRetrievalError('The job website could not be resolved. Paste the advertisement instead.');
    }
    return validateResolvedAddresses(addresses);
}

/** Recognizes the redirect status codes handled by the fetcher. */
export function isRedirectStatus(status: number): boolean {
    return [301, 302, 303, 307, 308].includes(status);
}

/** Enforces the maximum number of HTTP redirects. */
export function validateRedirectLimit(location: string | undefined, redirect: number): void {
    if (!location || redirect === MAX_REDIRECTS) {
        throw new JobAdvertisementRetrievalError('The job page redirects too many times. Paste the advertisement instead.');
    }
}

/** Validates a relative or absolute redirect target before another network request. */
export function parseRedirectTarget(location: string, current: URL): URL {
    try {
        return parseTarget(new URL(location, current).toString());
    } catch (error) {
        if (error instanceof JobAdvertisementRetrievalError) throw error;
        throw new JobAdvertisementRetrievalError('The job website redirected to an invalid URL. Paste the advertisement instead.');
    }
}

/** Rejects unsuccessful HTTP responses without exposing response bodies. */
export function validateResponseStatus(status: number): void {
    if (status !== 200) {
        throw new JobAdvertisementRetrievalError(`The job website returned HTTP ${status}. Paste the advertisement instead.`);
    }
}

/** Creates a single timeout covering DNS resolution, redirects and HTTP requests. */
export function createRequestDeadline(): AbortSignal {
    return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

/** Normalizes unexpected transport failures into safe user-facing errors. */
export async function retrievePage(url: URL, address: ResolvedAddress, signal: AbortSignal, transport: PageTransport): Promise<PageResponse> {
    try {
        return await transport(url, address, signal);
    } catch (error) {
        if (error instanceof JobAdvertisementRetrievalError) throw error;
        throw new JobAdvertisementRetrievalError('The job website could not be retrieved. Paste the advertisement instead.');
    }
}

/** Retrieves a public page, revalidating and pinning each redirect destination. */
export async function fetchSecurePage(
    rawUrl: string,
    resolver: HostResolver,
    transport: PageTransport,
    validateDomain: (url: URL) => void = () => {}
): Promise<{ original: URL; response: PageResponse }> {
    const original = parseTarget(rawUrl);
    validateDomain(original);
    let current = original;
    const signal = createRequestDeadline();
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
        const pinned = await resolveAndPinAddress(current, resolver, signal);
        const response = await retrievePage(current, pinned, signal, transport);
        if (isRedirectStatus(response.status)) {
            const location = response.headers.location;
            validateRedirectLimit(location, redirect);
            current = parseRedirectTarget(location!, current);
            validateDomain(current);
            continue;
        }
        validateResponseStatus(response.status);
        return { original, response };
    }
    throw new JobAdvertisementRetrievalError('Too many redirects. Paste the advertisement instead.');
}

/** Limits decoded response size, mitigating oversized pages and decompression bombs. */
export function exceedsResponseSizeLimit(decodedBytes: number): boolean {
    return decodedBytes > MAX_PAGE_BYTES;
}

/** Default injectable DNS resolver; callers may substitute a test resolver. */
export const defaultHostResolver: HostResolver = async hostname => lookup(hostname, { all: true });
