import { CloudinaryUploaderError, type RetryOptions } from '../types/index.js'

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
    fileIndex?: number,
): Promise<T> {
    const maxRetries = options.maxRetries ?? 0
    const retryDelay = options.retryDelay ?? 1000
    const backoffFactor = options.backoffFactor ?? 1

    let lastError: unknown

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err

            // Don't retry on validation errors
            if (
                err instanceof CloudinaryUploaderError &&
                err.code === 'VALIDATION_ERROR'
            ) {
                throw err
            }

            if (attempt < maxRetries) {
                const delay = retryDelay * Math.pow(backoffFactor, attempt)
                await sleep(delay)
            }
        }
    }

    if (lastError instanceof CloudinaryUploaderError) throw lastError

    throw new CloudinaryUploaderError(
        'NETWORK_ERROR',
        lastError instanceof Error
            ? lastError.message
            : 'Unknown error after retries',
        lastError,
        fileIndex,
    )
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}