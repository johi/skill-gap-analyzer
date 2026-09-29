
export interface ApiValidationIssue {
    path: string;
    message: string;
    code: string;
}

export interface ApiErrorResponse {
    error: string;
    message: string;
    issues?: ApiValidationIssue[];
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly error: string,
        message: string,
        public readonly issues: ApiValidationIssue[] = []
    ) {
        super(message);

        this.name = 'ApiError';
    }
}

export async function apiRequest<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(path, options);

    if (!response.ok) {
        const body = await response.json() as ApiErrorResponse;

        throw new ApiError(
            response.status,
            body.error,
            body.message,
            body.issues ?? []
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}