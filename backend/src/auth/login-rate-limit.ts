import { rateLimiter } from '../rate-limit/rate-limiter';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 60 * 15;

export async function checkLoginRateLimit(ip: string) {
    const result = await rateLimiter.check(ip, MAX_ATTEMPTS, WINDOW_SECONDS, {
        failOpen: false,
    });

    if (!result.success) {
        logger.warn({ ip }, 'Login rate limit exceeded');
        throw new AppError(
            `Too many login attempts. Please try again in ${Math.ceil(result.retryAfter || 60)} seconds.`,
            429,
        );
    }
}