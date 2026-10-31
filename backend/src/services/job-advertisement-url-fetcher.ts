import { JobAdvertisementRetrievalError } from '@/errors/job-advertisement-retrieval-error';
import { extractJobAdvertisement } from '@/services/job-advertisement-content';
import { classifyHtmlJobAdvertisement, type ContentClassificationProvider } from '@/services/job-advertisement-dom-classification';
import {
    defaultHostResolver,
    fetchSecurePage,
    requestPage,
    type HostResolver,
    type PageTransport,
} from '@/lib/secure-http-fetch';

export type { HostResolver, PageTransport, PageResponse, ResolvedAddress } from '@/lib/secure-http-fetch';

/** LinkedIn job content must be copied manually; never request it server-side. */
function rejectLinkedIn(url: URL): void {
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
        throw new JobAdvertisementRetrievalError(
            'LinkedIn job ads cannot be imported automatically. Open the listing and paste the job description instead.',
            422,
            'linkedin_manual_import_required'
        );
    }
}

/** Retrieves job advertisements using a separately secured HTTP transport. */
export class JobAdvertisementUrlFetcher {
    constructor(
        private readonly resolveHost: HostResolver = defaultHostResolver,
        private readonly transport: PageTransport = requestPage,
        private readonly classifier?: ContentClassificationProvider
    ) {}

    async retrieve(rawUrl: string): Promise<{ sourceUrl: string; advertisement: string; title?: string | null; metadataContext?: string }> {
        const { original, response } = await fetchSecurePage(rawUrl, this.resolveHost, this.transport, rejectLinkedIn);
        const contentType = String(response.headers['content-type'] ?? '');
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
}
