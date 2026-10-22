/** A safe, user-facing retrieval failure. Never includes response bodies or internal addresses. */
export class JobAdvertisementRetrievalError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 422,
        public readonly code: string = 'job_page_unavailable'
    ) {
        super(message);
        this.name = 'JobAdvertisementRetrievalError';
    }
}
