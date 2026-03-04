import * as v from 'valibot';
import { vProblemDetailsResponse } from './client/valibot.gen';

export type ApiSuccess<T> = {
    success: true;
    data: T;
};

export type ApiError = {
    success: false;
    message: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;

type HeyApiResponse<T, E> = {
    data?: T;
    error?: E;
    request: Request | object;
    response?: Response;
};

function parseError<Error>(data: Error | undefined): ApiError {
    const result = v.safeParse(vProblemDetailsResponse, data);
    if (!result.success) {
        console.error(`Unexpected error format:`, result.issues);
        return {
            success: false,
            message: 'Unknown Error'
        };
    }

    return {
        success: false,
        message: result.output.errors
            ? Object.values(result.output.errors).map(x => x.message).join(', ')
            : result.output.title ?? 'Unknown Error'
    };
}

/**
 * Wraps a heyapi method with error handling and automatic retry on rate limiting
 * Retries up to 3 times when receiving 429 with Retry-After header
 */
export async function api<T, E>(
    factory: (() => Promise<HeyApiResponse<T, E>>) | Promise<HeyApiResponse<T, E>>
): Promise<ApiResult<T>> {
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const promise = typeof factory === 'function' ? factory() : factory;
        let result: HeyApiResponse<T, E>;

        try {
            result = await promise;
        }
        catch (e) {
            if (e instanceof TypeError || e == null || typeof e !== 'object' || !('status' in e)) {
                return {
                    success: false,
                    message: 'Network Error'
                };
            }

            if (e.status === 429
                && 'retryAfter' in e
                && Number.isInteger(e.retryAfter)
                && attempt < MAX_RETRIES - 1
                && e.retryAfter as number < 15) {
                await new Promise(r => setTimeout(r, e.retryAfter as number * 1000));
                continue;
            }

            return parseError(e);
        }

        return {
            success: true,
            data: result.data!
        };
    }

    return {
        success: false,
        message: 'Too many requests. Please try again later'
    };
}
