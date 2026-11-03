export type RetryOptions = {
    retries?: number;
    baseDelayMs?: number;
    isRetryable?: (error: unknown) => boolean;
};

/** Retries on rate limits, 5xx responses and connection failures (OpenAI SDK error shapes). */
export function isTransientError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) return false;

    const { status, name } = error as { status?: unknown; name?: unknown };

    if (typeof status === "number") return status === 429 || status >= 500;

    return name === "APIConnectionError" || name === "APIConnectionTimeoutError";
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    { retries = 3, baseDelayMs = 500, isRetryable = isTransientError }: RetryOptions = {}
): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt >= retries || !isRetryable(error)) {
                throw error;
            }

            const delay = baseDelayMs * 2 ** (attempt - 1);
            console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
