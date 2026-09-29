export interface ApiErrorResponse {
    error: string;
    message: string;
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly error: string,
        message: string
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
            body.message
        );
    }

    return response.json() as Promise<T>;
}